import ky from "ky";
import { elysiaBaseUrl } from "@/lib/api-base-url";
import { del, get, post } from "@/lib/fetcher";

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

const apiBaseUrl = elysiaBaseUrl();

export async function fetchVfrToCfrTemplateInfo(): Promise<VfrToCfrTemplateInfo> {
  return get<VfrToCfrTemplateInfo>("/vfr-to-cfr", {
    baseURL: apiBaseUrl,
    timeout: 30_000,
  });
}

export async function listUploadedVideos(): Promise<VideoListItem[]> {
  return get<VideoListItem[]>("/vfr-to-cfr/uploaded", { baseURL: apiBaseUrl });
}

export async function listOutputVideos(): Promise<VideoListItem[]> {
  return get<VideoListItem[]>("/vfr-to-cfr/output", { baseURL: apiBaseUrl });
}

export async function getUploadedVideoDetail(id: string): Promise<VideoDetail> {
  return get<VideoDetail>(`/vfr-to-cfr/uploaded/${id}`, {
    baseURL: apiBaseUrl,
  });
}

export async function getOutputVideoDetail(id: string): Promise<VideoDetail> {
  return get<VideoDetail>(`/vfr-to-cfr/output/${id}`, { baseURL: apiBaseUrl });
}

export async function uploadVideoFile(
  video: File,
  options?: {
    onUploadProgress?: (update: UploadProgressUpdate) => void;
  },
): Promise<UploadVideoResult> {
  const formData = new FormData();
  formData.append("video", video);

  // ky is used here (instead of native fetch) because it is the only
  // widely-supported client that emits `onUploadProgress` events. The other
  // endpoints in this file don't need that and go through the native `fetcher`.
  const api = ky.create({
    prefixUrl: apiBaseUrl,
    timeout: VFR_TO_CFR_UPLOAD_TIMEOUT_MS,
  });
  return api
    .post("vfr-to-cfr/uploaded", {
      body: formData,
      onUploadProgress: (event) => {
        /* ky's Progress shape is { percent, transferredBytes, totalBytes };
         * map it to the axios-style { loaded, total? } the caller expects. */
        options?.onUploadProgress?.({
          loaded: event.transferredBytes,
          total: event.totalBytes,
        });
      },
    })
    .json<UploadVideoResult>();
}

export async function convertUploadedVideo(
  uploadId: string,
  options: ConvertUploadedOptions = {},
): Promise<ConvertVideoResult> {
  return post<ConvertVideoResult>(
    `/vfr-to-cfr/uploaded/${uploadId}/convert`,
    options,
    { baseURL: apiBaseUrl, timeout: 60_000 },
  );
}

export async function deleteUploadedVideo(id: string): Promise<void> {
  await del(`/vfr-to-cfr/uploaded/${id}`, { baseURL: apiBaseUrl });
}

export async function deleteOutputVideo(id: string): Promise<void> {
  await del(`/vfr-to-cfr/output/${id}`, { baseURL: apiBaseUrl });
}

export async function getProcessingJob(
  jobId: string,
): Promise<ProcessingJobResponse> {
  return get<ProcessingJobResponse>(`/jobs/${jobId}`, { baseURL: apiBaseUrl });
}

export function downloadOutputVideo(outputId: string): void {
  const url = `${apiBaseUrl.replace(/\/$/, "")}/vfr-to-cfr/output/${outputId}/download`;
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
    return `${(bytes / 1024).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${bytes.toLocaleString()} KB`;
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

/**
 * Read a structured error message from a fetcher / ky error.
 *
 * Both my custom `FetcherError` and ky's `HTTPError` expose the parsed
 * response body — the backend follows our `{ message: string | string[] }`
 * shape, so we read it the same way. Falls back to the error's own
 * `message`, then to "Request failed".
 */
export function readRequestErrorMessage(error: unknown): string {
  type ErrorWithBody = Error & { data?: unknown; response?: Response };
  const err = error as ErrorWithBody | null | undefined;
  if (!err) return "Request failed";

  const candidates: unknown[] = [];
  if (err.data !== undefined) candidates.push(err.data);
  if (
    err.response &&
    typeof err.response === "object" &&
    "data" in err.response
  ) {
    candidates.push((err.response as { data?: unknown }).data);
  }

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      const message = (candidate as { message?: string | string[] }).message;
      if (typeof message === "string") return message;
      if (Array.isArray(message)) return message.join(", ");
    }
  }
  if (err.message) return err.message;
  return "Request failed";
}
