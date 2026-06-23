import axios from "axios";

export const SALES_REPORT_DOMAIN_KIND = "sales-report" as const;

export type ImportErrorDetail = {
  message: string;
  sourceId?: string;
  originalName?: string;
  worksheetName?: string;
  rowNumber?: number;
  rawData?: string;
};

export type UploadSessionResponse = {
  uploadSessionId: string;
};

export type StartProcessingResponse = {
  jobId: string;
  manifestId: string;
};

export type ProcessingJobResponse = {
  jobId: string;
  domainKind: string;
  phase: "queued" | "processing" | "complete" | "failed";
  outcome: "pending" | "success" | "validation_failed" | "failed" | null;
  processedCount: number | null;
  errorCount: number | null;
  hasErrors: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type ProcessingJobErrorsJsonlHeader = {
  kind: "header";
  jobId: string;
  domainKind: string;
  errorCount: number;
};

const nestBaseUrl = process.env.NEXT_PUBLIC_NESTJS;

export const uploadSalesImportFiles = async (files: {
  salesData: File;
  inventory: File;
  productDescriptions: File;
}): Promise<UploadSessionResponse> => {
  const formData = new FormData();
  formData.append("salesData", files.salesData);
  formData.append("inventory", files.inventory);
  formData.append("productDescriptions", files.productDescriptions);

  const res = await axios.post<UploadSessionResponse>(
    `/applications/async-processing/${SALES_REPORT_DOMAIN_KIND}/upload`,
    formData,
    {
      baseURL: nestBaseUrl,
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 20 * 60 * 1000,
    },
  );
  return res.data;
};

export const startSalesImportProcessing = async (
  uploadSessionId: string,
): Promise<StartProcessingResponse> => {
  const res = await axios.post<StartProcessingResponse>(
    "/applications/async-processing/start",
    {
      uploadSessionId,
      domainKind: SALES_REPORT_DOMAIN_KIND,
    },
    {
      baseURL: nestBaseUrl,
      timeout: 60_000,
    },
  );
  return res.data;
};

export const getProcessingJob = async (
  jobId: string,
): Promise<ProcessingJobResponse> => {
  const res = await axios.get<ProcessingJobResponse>(`/jobs/${jobId}`, {
    baseURL: nestBaseUrl,
  });
  return res.data;
};

export const fetchProcessingErrorsJsonl = async (
  jobId: string,
): Promise<string> => {
  const res = await axios.get<string>(`/jobs/${jobId}/errors`, {
    baseURL: nestBaseUrl,
    responseType: "text",
  });
  return res.data;
};

export function triggerValidationErrorDownload(
  jobId: string,
  jsonl: string,
): void {
  const blob = new Blob([jsonl], {
    type: "application/x-ndjson",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `validation-errors-${jobId}.jsonl`;
  anchor.click();
  URL.revokeObjectURL(url);
}
