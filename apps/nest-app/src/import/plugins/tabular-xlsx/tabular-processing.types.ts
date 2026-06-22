import type { ErrorDetail } from "../../shared/import-error.types";

/** Plugin-emitted phase only — row iteration reports percent via onProgress callback */
export type TabularPluginPhase = "parsing_workbook";

/** Published via io.onProgress while parsing a workbook */
export type TabularProcessingProgress = {
  phase: TabularPluginPhase;
  sourceId: string;
  originalName?: string;
  worksheetName?: string;
  percent?: number;
};

/** Caller-owned sheet layout (exact Excel header strings) */
export type TabularSheetSpec = {
  sheetName: string;
  headers: readonly string[];
};

export type TabularRowHandler = (row: {
  rowNumber: number;
  cells: Record<string, string>;
}) => void | Promise<void>;

export type ParseSheetRowsHandlers = {
  onRow: TabularRowHandler;
  onProgress?: (percent: number) => Promise<void>;
  pushError: (detail: ErrorDetail) => void;
};

export type TabularParseContext = {
  sourceId: string;
  label?: string;
};

export type { ErrorDetail };
