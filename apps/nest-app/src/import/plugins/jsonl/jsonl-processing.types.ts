import type { ErrorDetail } from "../tabular-xlsx/tabular-processing.types";

/** Plugin-emitted phase only */
export type JsonlPluginPhase = "parsing_lines";

/** Plugin phase + domain-only phases */
export type JsonlProcessingPhase =
  | JsonlPluginPhase
  | "validating_rows"
  | "saving_database";

export type JsonlProcessingProgress = {
  phase: JsonlProcessingPhase;
  sourceId: string;
  originalName?: string;
  percent?: number;
};

export type JsonlParseContext = {
  sourceId: string;
  label?: string;
};

export type JsonlErrorScope = {
  sourceId: string;
  originalName?: string;
};

export type { ErrorDetail };

export type JsonlLineHandler = (line: {
  rowNumber: number;
  record: Record<string, unknown>;
}) => void | Promise<void>;

export type ParseJsonlLinesHandlers = {
  onLine: JsonlLineHandler;
  onProgress?: (percent: number) => Promise<void>;
  pushError: (detail: ErrorDetail) => void;
};
