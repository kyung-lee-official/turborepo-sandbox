import ky from "ky";
import { elysiaBaseUrl } from "@/lib/api-base-url";
import { fetcher, get, post } from "@/lib/fetcher";

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

const apiBaseUrl = elysiaBaseUrl();

export type UploadProgressUpdate = {
  loaded: number;
  total?: number;
};

export const uploadSalesImportFiles = async (
  files: {
    salesData: File;
    inventory: File;
    productDescriptions: File;
  },
  options?: {
    onUploadProgress?: (update: UploadProgressUpdate) => void;
  },
): Promise<UploadSessionResponse> => {
  const formData = new FormData();
  formData.append("salesData", files.salesData);
  formData.append("inventory", files.inventory);
  formData.append("productDescriptions", files.productDescriptions);

  // ky is used here (instead of native fetch) because it is the only
  // widely-supported client that emits `onUploadProgress` events. The other
  // endpoints in this file don't need that and go through the native `fetcher`.
  const api = ky.create({
    prefixUrl: apiBaseUrl,
    timeout: 20 * 60 * 1000,
  });
  return api
    .post(`applications/async-processing/${SALES_REPORT_DOMAIN_KIND}/upload`, {
      body: formData,
      // ky has its own retry/timeout handling; keep semantics close to the
      // previous axios call by forwarding the progress event.
      onUploadProgress: (event) => {
        /* ky's Progress shape is { percent, transferredBytes, totalBytes };
         * map it to the axios-style { loaded, total? } the caller expects. */
        options?.onUploadProgress?.({
          loaded: event.transferredBytes,
          total: event.totalBytes,
        });
      },
    })
    .json<UploadSessionResponse>();
};

export const startSalesImportProcessing = async (
  uploadSessionId: string,
): Promise<StartProcessingResponse> =>
  post<StartProcessingResponse>(
    "/applications/async-processing/start",
    { uploadSessionId, domainKind: SALES_REPORT_DOMAIN_KIND },
    { baseURL: apiBaseUrl, timeout: 60_000 },
  );

export const getProcessingJob = async (
  jobId: string,
): Promise<ProcessingJobResponse> =>
  get<ProcessingJobResponse>(`/jobs/${jobId}`, { baseURL: apiBaseUrl });

export const fetchProcessingErrorsJsonl = async (
  jobId: string,
): Promise<string> =>
  fetcher<string>(`/jobs/${jobId}/errors`, {
    baseURL: apiBaseUrl,
    responseType: "text",
  });

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
