/**
 * Appendix B — Support Layer: JSONL format plugin
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
