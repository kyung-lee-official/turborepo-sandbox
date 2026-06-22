import type { ErrorDetail } from "../../shared/import-error.types";

/** Plugin-emitted phase only */
export type JsonlPluginPhase = "parsing_lines";

/** Published via io.onProgress while parsing lines */
export type JsonlProcessingProgress = {
  phase: JsonlPluginPhase;
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
