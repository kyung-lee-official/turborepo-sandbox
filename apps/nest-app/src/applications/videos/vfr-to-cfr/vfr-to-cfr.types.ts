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
