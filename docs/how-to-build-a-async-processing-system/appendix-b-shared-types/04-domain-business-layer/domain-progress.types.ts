/**
 * Appendix B — Layer 4: Domain Business Layer — progress payloads
 */

export type DomainProcessingPhase =
  | "loading_source"
  | "validating_rows"
  | "saving_database";

export type DomainProcessingProgress = {
  phase: DomainProcessingPhase;
  sourceId: string;
  originalName?: string;
  worksheetName?: string;
  totalCount?: number;
  processedCount?: number;
  validCount?: number;
  errorCount?: number;
  percent?: number;
};
