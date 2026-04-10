import { MedusaError } from "@medusajs/framework/utils";
import { MEILISEARCH_REST_OLLAMA_BGE_PRESET } from "./rest-embedder-preset";

type MeilisearchOptions = {
  host: string;
  apiKey: string;
  productIndexName: string;
};

export type MeilisearchIndexType = "product";

export type HybridSearchParams = {
  embedder: string;
  semanticRatio?: number;
};

export type SearchOptions = {
  limit?: number;
  offset?: number;
  filter?: string[];
  hybrid?: HybridSearchParams;
};

type MeilisearchSearchHitResponse = {
  hits?: Record<string, unknown>[];
  estimatedTotalHits?: number;
  limit?: number;
  offset?: number;
  processingTimeMs?: number;
};

type MeilisearchTasksListResponse = {
  results?: Record<string, unknown>[];
} & Record<string, unknown>;

type QueryParams = Record<string, string | number | boolean | undefined>;

export default class MeilisearchModuleService {
  private readonly baseUrl: string;
  private readonly options: MeilisearchOptions;

  constructor(_: unknown, options: MeilisearchOptions) {
    if (!options.host || !options.apiKey || !options.productIndexName) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "Meilisearch configuration options are required: host, apiKey, productIndexName",
      );
    }
    this.baseUrl = options.host.replace(/\/$/, "");
    this.options = options;
  }

  private defaultHeaders(jsonBody: boolean): Headers {
    const h = new Headers();
    h.set("Authorization", `Bearer ${this.options.apiKey}`);
    if (jsonBody) {
      h.set("Content-Type", "application/json");
    }
    return h;
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const p = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.baseUrl}${p}`;
    if (!query) return url;
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue;
      sp.set(k, String(v));
    }
    const qs = sp.toString();
    return qs ? `${url}?${qs}` : url;
  }

  private async parseResponseBody<T>(res: Response): Promise<T> {
    const text = await res.text();
    if (!text) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }

  private async requestJson<T>(
    method: string,
    path: string,
    opts?: { query?: QueryParams; body?: unknown },
  ): Promise<T> {
    const hasBody =
      opts?.body !== undefined && method !== "GET" && method !== "HEAD";
    const url = this.buildUrl(path, opts?.query);
    const res = await fetch(url, {
      method,
      headers: this.defaultHeaders(hasBody),
      body: hasBody ? JSON.stringify(opts?.body) : undefined,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || res.statusText || `Meilisearch ${res.status}`);
    }
    return this.parseResponseBody<T>(res);
  }

  private async getJsonAllow404<T>(path: string): Promise<T | null> {
    const url = this.buildUrl(path);
    const res = await fetch(url, {
      method: "GET",
      headers: this.defaultHeaders(false),
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || res.statusText || `Meilisearch ${res.status}`);
    }
    const text = await res.text();
    if (!text) {
      return null;
    }
    return JSON.parse(text) as T;
  }

  /**
   * Resolve index name by type
   */
  async getIndexName(type: MeilisearchIndexType) {
    switch (type) {
      case "product":
        return this.options.productIndexName;
      default:
        throw new Error(`Invalid index type: ${type}`);
    }
  }

  /**
   * Index documents in Meilisearch
   */
  async indexData(
    data: Record<string, unknown>[],
    type: MeilisearchIndexType = "product",
  ) {
    if (!data || data.length === 0) {
      return;
    }

    const indexName = await this.getIndexName(type);
    const documents = data.map((item) => ({
      ...item,
      id: item.id,
    }));

    await this.requestJson("POST", `/indexes/${indexName}/documents`, {
      query: { primaryKey: "id" },
      body: documents,
    });
  }

  /**
   * Retrieve indexed documents by IDs
   */
  async retrieveFromIndex(
    documentIds: string[],
    type: MeilisearchIndexType = "product",
  ) {
    if (!documentIds || documentIds.length === 0) {
      return [];
    }

    const indexName = await this.getIndexName(type);

    const results = await Promise.all(
      documentIds.map((id) =>
        this.getJsonAllow404<Record<string, unknown>>(
          `/indexes/${indexName}/documents/${encodeURIComponent(id)}`,
        ),
      ),
    );

    return results.filter(
      (r): r is Record<string, unknown> => r !== null,
    );
  }

  /**
   * Delete documents from index by IDs
   */
  async deleteFromIndex(
    documentIds: string[],
    type: MeilisearchIndexType = "product",
  ) {
    if (!documentIds || documentIds.length === 0) {
      return;
    }

    const indexName = await this.getIndexName(type);

    await this.requestJson("POST", `/indexes/${indexName}/documents/delete-batch`, {
      body: { ids: documentIds },
    });
  }

  /**
   * Search indexed documents (keyword + optional hybrid / vector blend)
   */
  async search(
    query: string,
    options: SearchOptions = {},
    type: MeilisearchIndexType = "product",
  ): Promise<MeilisearchSearchHitResponse> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    if (!query || query.trim().length === 0) {
      return {
        hits: [],
        estimatedTotalHits: 0,
        limit,
        offset,
        processingTimeMs: 0,
      };
    }

    const indexName = await this.getIndexName(type);

    return await this.requestJson<MeilisearchSearchHitResponse>(
      "POST",
      `/indexes/${indexName}/search`,
      {
        body: {
          q: query,
          limit,
          offset,
          ...(options.filter && { filter: options.filter }),
          ...(options.hybrid && { hybrid: options.hybrid }),
        },
      },
    );
  }

  /**
   * Latest tasks: Meilisearch returns tasks in descending uid order by default
   * (newest first). Passing reverse=true would flip to oldest-first.
   */
  async listLatestTasks(limit: number): Promise<MeilisearchTasksListResponse> {
    return await this.requestJson<MeilisearchTasksListResponse>("GET", "/tasks", {
      query: { limit },
    });
  }

  async listIndexesRaw(params?: { limit?: number; offset?: number }) {
    return await this.requestJson("GET", "/indexes", {
      query: params,
    });
  }

  async createIndex(uid: string, options?: { primaryKey?: string }) {
    const body: { uid: string; primaryKey?: string } = { uid };
    if (options?.primaryKey) {
      body.primaryKey = options.primaryKey;
    }
    return await this.requestJson("POST", "/indexes", { body });
  }

  async deleteIndex(indexUid: string) {
    return await this.requestJson(
      "DELETE",
      `/indexes/${encodeURIComponent(indexUid)}`,
    );
  }

  async getEmbeddersForIndex(indexUid: string) {
    return await this.requestJson(
      "GET",
      `/indexes/${encodeURIComponent(indexUid)}/settings/embedders`,
    );
  }

  async updateEmbeddersForIndex(
    indexUid: string,
    embedders: Record<string, unknown>,
  ) {
    return await this.requestJson(
      "PATCH",
      `/indexes/${encodeURIComponent(indexUid)}/settings/embedders`,
      { body: embedders },
    );
  }

  /**
   * PATCH embedders with the built-in Ollama REST preset (bge-m3 @ 127.0.0.1:11434).
   */
  async applyRestOllamaBgeEmbedderPreset(indexUid: string) {
    return await this.updateEmbeddersForIndex(
      indexUid,
      MEILISEARCH_REST_OLLAMA_BGE_PRESET as unknown as Record<string, unknown>,
    );
  }

  async resetEmbeddersForIndex(indexUid: string) {
    return await this.requestJson(
      "DELETE",
      `/indexes/${encodeURIComponent(indexUid)}/settings/embedders`,
    );
  }

  async getDocumentsForIndex(
    indexUid: string,
    query?: {
      limit?: number;
      offset?: number;
      fields?: string[];
      filter?: string;
      retrieveVectors?: boolean;
    },
  ) {
    const queryParams: QueryParams = {
      limit: query?.limit,
      offset: query?.offset,
      filter: query?.filter,
      retrieveVectors: query?.retrieveVectors,
    };
    if (query?.fields?.length) {
      queryParams.fields = query.fields.join(",");
    }
    return await this.requestJson(
      "GET",
      `/indexes/${encodeURIComponent(indexUid)}/documents`,
      { query: queryParams },
    );
  }

  async addOrReplaceDocumentsForIndex(
    indexUid: string,
    documents: Record<string, unknown>[],
  ) {
    return await this.requestJson(
      "POST",
      `/indexes/${encodeURIComponent(indexUid)}/documents`,
      {
        query: { primaryKey: "id" },
        body: documents,
      },
    );
  }

  async deleteAllDocumentsForIndex(indexUid: string) {
    return await this.requestJson(
      "DELETE",
      `/indexes/${encodeURIComponent(indexUid)}/documents`,
    );
  }
}
