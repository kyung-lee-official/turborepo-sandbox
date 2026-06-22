import axios from "axios";

export const SALES_REPORT_DOMAIN_KIND = "sales-report" as const;

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
  errorStorageKey: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
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

export const downloadProcessingErrors = async (
  jobId: string,
): Promise<Blob> => {
  const res = await axios.get(`/jobs/${jobId}/errors`, {
    baseURL: nestBaseUrl,
    responseType: "blob",
  });
  return res.data;
};

export function triggerValidationErrorDownload(
  jobId: string,
  blob: Blob,
): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `validation-errors-${jobId}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function waitForProcessingJob(
  jobId: string,
  options?: { pollIntervalMs?: number; timeoutMs?: number },
): Promise<ProcessingJobResponse> {
  const pollIntervalMs = options?.pollIntervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs ?? 30 * 60 * 1000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await getProcessingJob(jobId);
    if (job.phase === "complete" || job.phase === "failed") {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Timed out waiting for job ${jobId}`);
}
