/** Validation error row — format-agnostic; used by any import plugin and domain runner */
export type ErrorDetail = {
  message: string;
  sourceId?: string;
  originalName?: string;
  /** Tabular sources only — omit for JSONL and other line formats */
  worksheetName?: string;
  /** 1-based row or line in the source file */
  rowNumber?: number;
  rawData?: string;
};
