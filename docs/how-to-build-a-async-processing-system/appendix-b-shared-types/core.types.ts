/**
 * Appendix B — async processing core types (orchestrator, worker, registry).
 */

import type { Readable } from "node:stream";

import type { ProcessingSource } from "./adapter.types";
import type { ErrorDetail } from "./import-shared.types";
import type { VerifiedSourceLocator } from "./source-locator.types";

export type ProcessingPhase = "queued" | "processing" | "complete" | "failed";

export type ProcessingOutcome = "success" | "validation_failed" | "failed";

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

export type DomainRunnerIo = {
  openStream: (source: VerifiedProcessingSource) => Promise<Readable>;
  onProgress: (detail: unknown) => Promise<void>;
  context?: Record<string, unknown>;
};

export type DomainRunResult =
  | { outcome: "success"; processedCount: number; errorCount: 0 }
  | {
      outcome: "validation_failed";
      processedCount: number;
      errorCount: number;
      errors: readonly ErrorDetail[];
    };

export type DomainRunner = {
  domainKind: string;
  run(
    jobId: string,
    sources: Map<string, VerifiedProcessingSource>,
    io: DomainRunnerIo,
  ): Promise<DomainRunResult>;
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
