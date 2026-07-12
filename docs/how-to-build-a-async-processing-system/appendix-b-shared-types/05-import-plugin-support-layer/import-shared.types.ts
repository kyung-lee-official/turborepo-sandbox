/**
 * Appendix B — Support Layer: shared import utilities
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
