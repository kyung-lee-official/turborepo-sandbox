import { MedusaError } from "@medusajs/framework/utils";
import axios, { type AxiosInstance } from "axios";

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

export default class MeilisearchModuleService {
  private http: AxiosInstance;
  private options: MeilisearchOptions;

  constructor(_: unknown, options: MeilisearchOptions) {
    if (!options.host || !options.apiKey || !options.productIndexName) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "Meilisearch configuration options are required: host, apiKey, productIndexName",
      );
    }
    const baseURL = options.host.replace(/\/$/, "");
    this.http = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    this.options = options;
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

    await this.http.post(`/indexes/${indexName}/documents`, documents, {
      params: { primaryKey: "id" },
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
      documentIds.map(async (id) => {
        try {
          const { data } = await this.http.get<Record<string, unknown>>(
            `/indexes/${indexName}/documents/${encodeURIComponent(id)}`,
          );
          return data;
        } catch {
          return null;
        }
      }),
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

    await this.http.post(`/indexes/${indexName}/documents/delete-batch`, {
      ids: documentIds,
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

    const { data } = await this.http.post<MeilisearchSearchHitResponse>(
      `/indexes/${indexName}/search`,
      {
        q: query,
        limit,
        offset,
        ...(options.filter && { filter: options.filter }),
        ...(options.hybrid && { hybrid: options.hybrid }),
      },
    );

    return data;
  }

  async listLatestTasks(limit: number) {
    const { data } = await this.http.get("/tasks", {
      params: { limit, reverse: true },
    });
    return data;
  }

  async listIndexesRaw(params?: { limit?: number; offset?: number }) {
    const { data } = await this.http.get("/indexes", { params });
    return data;
  }

  async createIndex(uid: string, options?: { primaryKey?: string }) {
    const body: { uid: string; primaryKey?: string } = { uid };
    if (options?.primaryKey) {
      body.primaryKey = options.primaryKey;
    }
    const { data } = await this.http.post("/indexes", body);
    return data;
  }

  async getEmbeddersForIndex(indexUid: string) {
    const { data } = await this.http.get(
      `/indexes/${encodeURIComponent(indexUid)}/settings/embedders`,
    );
    return data;
  }

  async updateEmbeddersForIndex(
    indexUid: string,
    embedders: Record<string, unknown>,
  ) {
    const { data } = await this.http.patch(
      `/indexes/${encodeURIComponent(indexUid)}/settings/embedders`,
      embedders,
    );
    return data;
  }

  async resetEmbeddersForIndex(indexUid: string) {
    const { data } = await this.http.delete(
      `/indexes/${encodeURIComponent(indexUid)}/settings/embedders`,
    );
    return data;
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
    const params: Record<string, string | number | boolean | undefined> = {
      limit: query?.limit,
      offset: query?.offset,
      filter: query?.filter,
      retrieveVectors: query?.retrieveVectors,
    };
    if (query?.fields?.length) {
      params.fields = query.fields.join(",");
    }
    const { data } = await this.http.get(
      `/indexes/${encodeURIComponent(indexUid)}/documents`,
      { params },
    );
    return data;
  }

  async addOrReplaceDocumentsForIndex(
    indexUid: string,
    documents: Record<string, unknown>[],
  ) {
    const { data } = await this.http.post(
      `/indexes/${encodeURIComponent(indexUid)}/documents`,
      documents,
      { params: { primaryKey: "id" } },
    );
    return data;
  }

  async deleteAllDocumentsForIndex(indexUid: string) {
    const { data } = await this.http.delete(
      `/indexes/${encodeURIComponent(indexUid)}/documents`,
    );
    return data;
  }
}
