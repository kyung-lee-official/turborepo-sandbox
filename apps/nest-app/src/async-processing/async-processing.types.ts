import type { Readable } from "node:stream";
import type {
  ProcessingJob as PrismaProcessingJob,
  ProcessingOutcome as PrismaProcessingOutcome,
  ProcessingPhase as PrismaProcessingPhase,
} from "@repo/database";

export const ASYNC_PROCESSING_QUEUE = "async-processing" as const;

export type ProcessingPhase = PrismaProcessingPhase;
export type ProcessingOutcome = PrismaProcessingOutcome;
export type ProcessingJob = PrismaProcessingJob;

export type SourceLocator =
  | { kind: "local"; path: string; declaredSizeBytes?: number }
  | {
      kind: "object";
      provider: "s3" | "cos";
      bucket: string;
      key: string;
      declaredSizeBytes?: number;
    };

export type ProcessingSource = {
  sourceId: string;
  label?: string;
  mimeType?: string;
  locator: SourceLocator;
};

export type StartProcessingInput = {
  domainKind: string;
  sources: Record<string, ProcessingSource>;
};

export type VerifiedSourceLocator = SourceLocator & {
  sizeBytes: number;
  etag?: string;
};

export type VerifiedProcessingSource = ProcessingSource & {
  verifiedLocator: VerifiedSourceLocator;
};

export type DomainRunResult =
  | { outcome: "success"; processedCount: number; errorCount: 0 }
  | {
      outcome: "validation_failed";
      processedCount: number;
      errorCount: number;
      errorBlob?: Buffer;
    };

export type DomainRunner = {
  domainKind: string;
  run(
    sources: Map<string, VerifiedProcessingSource>,
    io: {
      openStream: (source: VerifiedProcessingSource) => Promise<Readable>;
      onProgress: (detail: unknown) => Promise<void>;
    },
  ): Promise<DomainRunResult>;
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

export type SourceSpec = { sourceId: string; required: boolean };

export type ProcessingLockPolicy =
  | { type: "none" }
  | { type: "global_singleton" };

export type DomainKindRegistration = {
  domainRunner: DomainRunner;
  sourceSpecs: SourceSpec[];
  lockPolicy: ProcessingLockPolicy;
};

export class ActiveJobConflictError extends Error {
  constructor(domainKind: string) {
    super(`A processing job is already active for domainKind ${domainKind}`);
    this.name = "ActiveJobConflictError";
  }
}

export const ACTIVE_JOB_TTL_SECONDS = 60 * 60 * 24;
export const STALE_PROCESSING_MS = 2 * 60 * 60 * 1000;
export const SSE_IDLE_TIMEOUT_MS = 60_000;
export const LEASE_REFRESH_INTERVAL_MS = 60_000;
