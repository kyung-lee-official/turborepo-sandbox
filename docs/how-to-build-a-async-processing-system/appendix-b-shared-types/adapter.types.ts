/**
 * Appendix B — start adapter boundary types.
 */

import type { SourceLocator } from "./source-locator.types";
import type { UploadSession, UploadSessionSources } from "./upload.types";

export interface UploadSessionStore {
  save(session: UploadSession): Promise<void>;
  get(uploadSessionId: string): Promise<UploadSession | null>;
  consume(uploadSessionId: string): Promise<void>;
}

export type ProcessingStartRequestedPayload = {
  domainKind: string;
  sources: UploadSessionSources;
  context?: Record<string, unknown>;
};

export type StartProcessingInput = {
  domainKind: string;
  sources: Record<string, ProcessingSource>;
  context?: Record<string, unknown>;
};

export type ProcessingSource = {
  sourceId: string;
  label?: string;
  mimeType?: string;
  locator: SourceLocator;
};

export type StartApiBody = {
  uploadSessionId: string;
  domainKind?: string;
};

export type StartProcessingResult = {
  jobId: string;
  manifestId: string;
};
