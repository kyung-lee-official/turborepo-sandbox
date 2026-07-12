/**
 * Appendix B — Layer 1: Optional Upload Layer
 */

import type { SourceLocator } from "../shared/source-locator.types";

export type LocalUploadSession = {
  domainKind: string;
  autoStart?: boolean;
  uploadSessionId?: string;
  context?: Record<string, unknown>;
};

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

export type DeferredUploadResult = {
  uploadSessionId: string;
};

export type S3InitiateResult = {
  uploadSessionId: string;
  uploads: Record<
    string,
    {
      sourceId: string;
      bucket: string;
      key: string;
      presignedPutUrl: string;
      requiredHeaders?: { "Content-Type"?: string };
    }
  >;
};

export type S3CompleteBody = {
  uploadSessionId: string;
  files: Array<{
    sourceId: string;
    declaredSizeBytes?: number;
  }>;
};
