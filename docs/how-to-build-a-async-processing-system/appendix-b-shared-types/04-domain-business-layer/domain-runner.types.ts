/**
 * Appendix B — Layer 4: Domain Business Layer — runner contract
 */

import type { Readable } from "node:stream";

import type { VerifiedProcessingSource } from "../03-async-processing-core-layer/core.types";
import type { ErrorDetail } from "../05-import-plugin-support-layer/import-shared.types";

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
