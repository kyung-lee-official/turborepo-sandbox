import type { ProcessingJob as PrismaProcessingJob } from "../../generated/prisma/client.ts";

export type ProcessingPhase = "queued" | "processing" | "complete" | "failed";

export type ProcessingOutcome =
  | "pending"
  | "success"
  | "validation_failed"
  | "failed"
  | null;

export type ProcessingJob = PrismaProcessingJob;

export type SourceLocator =
  | { kind: "local"; path: string; declaredSizeBytes?: number }
  | {
      kind: "object";
      provider: "s3" | "cos" | "aliyun";
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
  context?: Record<string, unknown>;
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
      errors: readonly {
        message: string;
        sourceId?: string;
        originalName?: string;
        worksheetName?: string;
        rowNumber?: number;
        rawData?: string;
      }[];
    };

export type DomainRunnerIo = {
  openStream: (
    source: VerifiedProcessingSource,
  ) => Promise<NodeJS.ReadableStream>;
  onProgress: (detail: unknown) => Promise<void>;
  context?: Record<string, unknown>;
};

export type DomainRunner = {
  domainKind: string;
  run: (
    jobId: string,
    sources: Map<string, VerifiedProcessingSource>,
    io: DomainRunnerIo,
  ) => Promise<DomainRunResult>;
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

export const STALE_PROCESSING_MS = 2 * 60 * 60 * 1000;
