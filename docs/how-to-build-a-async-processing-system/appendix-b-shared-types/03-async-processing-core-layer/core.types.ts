/**
 * Appendix B — Layer 3: Async Processing Core Layer
 */

import type { ProcessingSource } from "../02-start-processing-adapter-layer/adapter.types";
import type { DomainRunner } from "../04-domain-business-layer/domain-runner.types";
import type { SourceLocator } from "../shared/source-locator.types";

export type ProcessingPhase = "queued" | "processing" | "complete" | "failed";

export type ProcessingOutcome = "success" | "validation_failed" | "failed";

export type VerifiedSourceLocator = SourceLocator & {
  sizeBytes: number;
  etag?: string;
};

export type VerifiedProcessingSource = ProcessingSource & {
  verifiedLocator: VerifiedSourceLocator;
};

export type AsyncProcessingJobPayload = {
  jobId: string;
  domainKind: string;
  manifestId: string;
};

export type ProcessingProgressEvent = {
  jobId: string;
  progress: unknown;
};

export type ProcessingTerminalEvent = {
  jobId: string;
  phase: "complete" | "failed";
};

export type SourceSpec = {
  sourceId: string;
  required: boolean;
};

export type ProcessingLockPolicy =
  | { type: "none" }
  | { type: "global_singleton" };

export type DomainUploadPolicy = {
  allowedMimeBySourceId?: Record<string, readonly string[]>;
  defaultAllowedMimeTypes?: readonly string[];
};

export type DomainKindRegistration = {
  domainRunner: DomainRunner;
  sourceSpecs: SourceSpec[];
  lockPolicy: ProcessingLockPolicy;
  upload?: DomainUploadPolicy;
};

export class ActiveJobConflictError extends Error {
  constructor(domainKind: string) {
    super(`A processing job is already active for domainKind ${domainKind}`);
    this.name = "ActiveJobConflictError";
  }
}
