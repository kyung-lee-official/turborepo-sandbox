/**
 * Preset Meilisearch REST embedder targeting Ollama at 127.0.0.1:11434 (bge-m3).
 * @see https://www.meilisearch.com/docs/learn/ai_powered_search/getting_started_with_ai_search
 */
export const MEILISEARCH_REST_OLLAMA_BGE_PRESET = {
  default: {
    source: "rest",
    dimensions: 1024,
    documentTemplate:
      "A document named '{{doc.name}}' whose description starts with {{doc.description}}, categorized to {{doc.category}}",
    documentTemplateMaxBytes: 400,
    url: "http://127.0.0.1:11434/api/embed",
    request: {
      model: "bge-m3:latest",
      input: "{{text}}",
    },
    response: {
      embeddings: ["{{embedding}}"],
    },
    headers: {},
  },
} as const satisfies Record<string, Record<string, unknown>>;
