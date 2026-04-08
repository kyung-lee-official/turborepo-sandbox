import { MedusaError } from "@medusajs/framework/utils";

const { Meilisearch } = require("meilisearch");

type MeilisearchOptions = {
  host: string;
  apiKey: string;
  productIndexName: string;
};

export type MeilisearchIndexType = "product";

export type SearchOptions = {
  limit?: number;
  offset?: number;
  filter?: string[];
};

export default class MeilisearchModuleService {
  private client: typeof Meilisearch;
  private options: MeilisearchOptions;

  constructor(_: any, options: MeilisearchOptions) {
    if (!options.host || !options.apiKey || !options.productIndexName) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "Meilisearch configuration options are required: host, apiKey, productIndexName",
      );
    }
    this.client = new Meilisearch({
      host: options.host,
      apiKey: options.apiKey,
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
    const index = this.client.index(indexName);

    const documents = data.map((item) => ({
      ...item,
      id: item.id,
    }));

    await index.addDocuments(documents);
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
    const index = this.client.index(indexName);

    const results = await Promise.all(
      documentIds.map(async (id) => {
        try {
          return await index.getDocument(id);
        } catch (error) {
          return null;
        }
      }),
    );

    return results.filter(Boolean);
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
    const index = this.client.index(indexName);

    await index.deleteDocuments(documentIds);
  }

  /**
   * Search indexed documents
   */
  async search(
    query: string,
    options: SearchOptions = {},
    type: MeilisearchIndexType = "product",
  ) {
    if (!query || query.trim().length === 0) {
      return { hits: [], estimatedTotalHits: 0 };
    }

    const indexName = await this.getIndexName(type);
    const index = this.client.index(indexName);

    const searchParams = {
      limit: options.limit || 20,
      offset: options.offset || 0,
      ...(options.filter && { filter: options.filter }),
    };

    return await index.search(query, searchParams);
  }
}
