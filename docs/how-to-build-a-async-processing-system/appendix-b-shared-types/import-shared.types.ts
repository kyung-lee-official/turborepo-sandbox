/**
 * Appendix B — cross-format import utilities.
 */

export type ErrorDetail = {
  message: string;
  sourceId?: string;
  originalName?: string;
  worksheetName?: string;
  rowNumber?: number;
  rawData?: string;
};

export type ProcessingJobErrorsHeader = {
  kind: "header";
  jobId: string;
  domainKind: string;
  errorCount: number;
};

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
