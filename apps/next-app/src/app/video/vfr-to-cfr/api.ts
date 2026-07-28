import axios from "axios";

export const VFR_TO_CFR_UPLOAD_TIMEOUT_MS = 0;
export const VFR_TO_CFR_JOB_WAIT_TIMEOUT_MS = 6 * 60 * 60 * 1000;
export const DEFAULT_VFR_TO_CFR_MAX_UPLOAD_BYTES = 22 * 1024 * 1024 * 1024;

export type VideoListItem = {
  id: string;
  kind: "uploaded" | "output";
  label: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
  durationSeconds: number | null;
  sourceUploadId?: string;
  jobId?: string;
};

export type VideoDetail = VideoListItem & {
  metadataMarkdown: string;
  avgFrameRate?: string | null;
  avgFrameRateFps?: number | null;
  suggestedTargetFps?: number | null;
};

export type ConvertUploadedOptions = {
  targetFps?: number;
  matchSourceAverage?: boolean;
};

export type UploadVideoResult = {
  id: string;
  label: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
  durationSeconds: number | null;
};

export type ConvertVideoResult = {
  jobId: string;
  outputId: string;
  uploadId: string;
  targetFps: number;
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
  targetFpsPresets: number[];
  defaultTargetFps: number;
};

export const DEFAULT_VFR_TO_CFR_TARGET_FPS_PRESETS = [
  23.976, 24, 25, 29.97, 30, 59.94, 60,
] as const;

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

export async function listUploadedVideos(): Promise<VideoListItem[]> {
  const res = await axios.get<VideoListItem[]>("/vfr-to-cfr/uploaded", {
    baseURL: nestBaseUrl,
  });
  return res.data;
}

export async function listOutputVideos(): Promise<VideoListItem[]> {
  const res = await axios.get<VideoListItem[]>("/vfr-to-cfr/output", {
    baseURL: nestBaseUrl,
  });
  return res.data;
}

export async function getUploadedVideoDetail(id: string): Promise<VideoDetail> {
  const res = await axios.get<VideoDetail>(`/vfr-to-cfr/uploaded/${id}`, {
    baseURL: nestBaseUrl,
  });
  return res.data;
}

export async function getOutputVideoDetail(id: string): Promise<VideoDetail> {
  const res = await axios.get<VideoDetail>(`/vfr-to-cfr/output/${id}`, {
    baseURL: nestBaseUrl,
  });
  return res.data;
}

export async function uploadVideoFile(
  video: File,
  options?: {
    onUploadProgress?: (update: UploadProgressUpdate) => void;
  },
): Promise<UploadVideoResult> {
  const formData = new FormData();
  formData.append("video", video);

  const res = await axios.post<UploadVideoResult>(
    "/vfr-to-cfr/uploaded",
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
}

export async function convertUploadedVideo(
  uploadId: string,
  options: ConvertUploadedOptions = {},
): Promise<ConvertVideoResult> {
  const res = await axios.post<ConvertVideoResult>(
    `/vfr-to-cfr/uploaded/${uploadId}/convert`,
    options,
    {
      baseURL: nestBaseUrl,
      timeout: 60_000,
    },
  );
  return res.data;
}

export async function deleteUploadedVideo(id: string): Promise<void> {
  await axios.delete(`/vfr-to-cfr/uploaded/${id}`, {
    baseURL: nestBaseUrl,
  });
}

export async function deleteOutputVideo(id: string): Promise<void> {
  await axios.delete(`/vfr-to-cfr/output/${id}`, {
    baseURL: nestBaseUrl,
  });
}

export async function getProcessingJob(
  jobId: string,
): Promise<ProcessingJobResponse> {
  const res = await axios.get<ProcessingJobResponse>(`/jobs/${jobId}`, {
    baseURL: nestBaseUrl,
  });
  return res.data;
}

export function downloadOutputVideo(outputId: string): void {
  if (!nestBaseUrl) {
    throw new Error("NEXT_PUBLIC_NESTJS is not configured");
  }
  const url = `${nestBaseUrl.replace(/\/$/, "")}/vfr-to-cfr/output/${outputId}/download`;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cfr-${outputId}.mp4`;
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

export function formatDuration(seconds: number | null): string {
  if (seconds == null) {
    return "—";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function formatTargetFps(fps: number): string {
  if (Number.isInteger(fps)) {
    return String(fps);
  }
  return fps
    .toFixed(3)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
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
