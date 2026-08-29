export type { ErrorDetail } from "../../shared/import-error.types.ts";

export type TabularErrorScope = {
  sourceId: string;
  originalName?: string;
  worksheetName?: string;
};

export type TabularPluginPhase = "parsing_workbook";

export type TabularProcessingProgress = {
  phase: TabularPluginPhase;
  sourceId: string;
  originalName?: string;
  worksheetName?: string;
  percent?: number;
};

export type TabularSheetSpec = {
  sheetName: string;
  headers: readonly string[];
};

export type TabularRowHandler = (row: {
  rowNumber: number;
  cells: Record<string, string>;
}) => void | Promise<void>;

export type SheetRowProgress = {
  processedCount: number;
  totalCount: number;
  percent: number;
};

export type ParseSheetRowsHandlers = {
  onRow: TabularRowHandler;
  onProgress?: (detail: SheetRowProgress) => Promise<void>;
  pushError: (
    detail: import("../../shared/import-error.types.ts").ErrorDetail,
  ) => void;
};

export type TabularParseContext = {
  sourceId: string;
  label?: string;
};

export type ParseWorkbookContext = {
  sourceId: string;
  label?: string;
};
