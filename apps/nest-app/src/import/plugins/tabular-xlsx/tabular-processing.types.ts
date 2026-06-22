/** Plugin-emitted phase only — row iteration reports percent via onProgress callback */
export type TabularPluginPhase = "parsing_workbook";

/** Plugin phase + domain-only phases */
export type TabularProcessingPhase =
  | TabularPluginPhase
  | "validating_rows"
  | "saving_database";

/** Published via io.onProgress during domainRunner.run */
export type TabularProcessingProgress = {
  phase: TabularProcessingPhase;
  sourceId: string;
  originalName?: string;
  worksheetName?: string;
  percent?: number;
};

/** Defined by domain module per domainKind / sheet (exact Excel header strings) */
export type TabularSheetSpec = {
  sheetName: string;
  headers: readonly string[];
};

export type ErrorDetail = {
  message: string;
  sourceId?: string;
  originalName?: string;
  worksheetName?: string;
  rowNumber?: number;
  rawData?: string;
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
