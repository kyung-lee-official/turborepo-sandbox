import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MEILISEARCH_MODULE } from "@/modules/meilisearch";
import type MeilisearchModuleService from "@/modules/meilisearch/service";
import type { StoreSearchRequest } from "./validators";

/**
 * POST /store-api/search
 * Search for products in Meilisearch index.
 *
 * Request body:
 * {
 *   "query": "search term",
 *   "limit": 20,            // Default: 20
 *   "offset": 0,            // Default: 0
 *   "filter": ["status:published"]  // Optional filters
 * }
 */
export async function POST(
  req: MedusaRequest<StoreSearchRequest>,
  res: MedusaResponse,
) {
  const logger = req.scope.resolve("logger");
  const { query, limit, offset, filter } = req.validatedBody;

  try {
    const meilisearchService =
      req.scope.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);

    const results = await meilisearchService.search(
      query, // Already trimmed by validation schema
      { limit, offset, filter },
      "product",
    );

    res.json({
      query,
      pagination: {
        limit,
        offset,
        total: results.estimatedTotalHits || 0,
      },
      hits: results.hits || [],
      processingTimeMs: results.processingTimeMs,
    });
  } catch (error) {
    logger.error(
      "Product search failed",
      error instanceof Error ? error : new Error(String(error)),
    );

    res.status(500).json({
      message: "Search service is temporarily unavailable",
      code: "SEARCH_ERROR",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
