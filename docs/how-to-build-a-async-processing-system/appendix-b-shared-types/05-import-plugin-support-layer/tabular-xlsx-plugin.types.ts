/**
 * Appendix B — Support Layer: tabular XLSX format plugin
 */

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

export type TabularParseContext = {
  sourceId: string;
  label?: string;
};

export type TabularParsedRow = {
  rowNumber: number;
  cells: Record<string, string>;
};
