/** Post-parse phases emitted by domain runners — not format plugins */
export type DomainProcessingPhase = "validating_rows" | "saving_database";

export type DomainProcessingProgress = {
  phase: DomainProcessingPhase;
  sourceId: string;
  originalName?: string;
  /** When progress relates to a tabular worksheet */
  worksheetName?: string;
  totalCount?: number;
  processedCount?: number;
  validCount?: number;
  errorCount?: number;
  percent?: number;
};
