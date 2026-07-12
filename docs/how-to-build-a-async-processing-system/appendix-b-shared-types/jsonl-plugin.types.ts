/**
 * Appendix B — JSONL format plugin types.
 */

export type JsonlPluginPhase = "parsing_lines";

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
