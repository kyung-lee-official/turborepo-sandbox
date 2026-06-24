import type { SourceLocator } from "../async-processing.types";

export type UploadSourceEntry = {
  sourceId: string;
  originalName: string;
  mimeType?: string;
  locator: SourceLocator;
};

export type UploadSessionSources = Record<string, UploadSourceEntry>;

export type UploadSession = {
  uploadSessionId: string;
  domainKind: string;
  sources: UploadSessionSources;
  expiresAt: Date;
  startedJobId?: string;
  startedManifestId?: string;
  context?: Record<string, unknown>;
};

export const PROCESSING_START_REQUESTED_EVENT =
  "processing.start-requested" as const;

export const UPLOAD_SESSION_REDIS_KEY_PREFIX =
  "async-processing:upload-session:" as const;

export const DEFAULT_UPLOAD_SESSION_TTL_SECONDS = 60 * 60 * 24;
