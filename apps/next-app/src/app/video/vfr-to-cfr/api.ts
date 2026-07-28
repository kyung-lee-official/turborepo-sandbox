import axios from "axios";

/** No axios timeout — 20 GB uploads can take hours on slow links. */
export const VFR_TO_CFR_UPLOAD_TIMEOUT_MS = 0;

/** Allow multi-hour libx264 re-encode for large sources. */
export const VFR_TO_CFR_JOB_WAIT_TIMEOUT_MS = 6 * 60 * 60 * 1000;

/** Matches Nest default when env unset (22 GiB). */
export const DEFAULT_VFR_TO_CFR_MAX_UPLOAD_BYTES = 22 * 1024 * 1024 * 1024;

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

export type VfrToCfrTemplateInfo = {
  maxUploadBytes: number;
  maxUploadBytesEnv: string;
};

export type UploadProgressUpdate = {
  loaded: number;
  total?: number;
};

const nestBaseUrl = process.env.NEXT_PUBLIC_NESTJS;

export async function fetchVfrToCfrTemplateInfo(): Promise<VfrToCfrTemplateInfo> {
  const res = await axios.get<VfrToCfrTemplateInfo>("/vfr-to-cfr", {
    baseURL: nestBaseUrl,
    timeout: 30_000,
  });
  return res.data;
}

export const uploadVfrVideo = async (
  video: File,
  options?: {
    onUploadProgress?: (update: UploadProgressUpdate) => void;
  },
): Promise<UploadSessionResponse> => {
  const formData = new FormData();
  formData.append("video", video);

  const res = await axios.post<UploadSessionResponse>(
    "/vfr-to-cfr/upload",
    formData,
    {
      baseURL: nestBaseUrl,
      headers: { "Content-Type": "multipart/form-data" },
      timeout: VFR_TO_CFR_UPLOAD_TIMEOUT_MS,
      onUploadProgress: (event) => {
        options?.onUploadProgress?.({
          loaded: event.loaded,
          total: event.total,
        });
      },
    },
  );
  return res.data;
};

export const startVfrToCfrProcessing = async (
  uploadSessionId: string,
): Promise<StartProcessingResponse> => {
  const res = await axios.post<StartProcessingResponse>(
    "/vfr-to-cfr/start",
    {
      uploadSessionId,
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

export function downloadConvertedVideo(jobId: string): void {
  if (!nestBaseUrl) {
    throw new Error("NEXT_PUBLIC_NESTJS is not configured");
  }
  const url = `${nestBaseUrl.replace(/\/$/, "")}/vfr-to-cfr/jobs/${jobId}/download`;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cfr-${jobId}.mp4`;
  anchor.click();
}

export function formatVideoFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes.toLocaleString()} B`;
}

export function readAxiosErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (typeof data?.message === "string") {
      return data.message;
    }
    if (Array.isArray(data?.message)) {
      return data.message.join(", ");
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Request failed";
}
