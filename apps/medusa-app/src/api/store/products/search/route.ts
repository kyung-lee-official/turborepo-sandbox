import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MEILISEARCH_MODULE } from "@/modules/meilisearch";
import type MeilisearchModuleService from "@/modules/meilisearch/service";

type SearchRequestBody = {
  query?: string;
  limit?: number;
  offset?: number;
  filter?: string[];
};

/**
 * POST /store/products/search
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
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger");
  const {
    query,
    limit = 20,
    offset = 0,
    filter,
  } = req.body as SearchRequestBody;

  try {
    // Validate query
    if (!query || typeof query !== "string" || query.trim().length < 1) {
      return res.status(400).json({
        message: "Search query is required and must be a non-empty string",
        code: "INVALID_QUERY",
      });
    }

    // Validate pagination parameters
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        message: "Limit must be an integer between 1 and 100",
        code: "INVALID_LIMIT",
      });
    }

    if (!Number.isInteger(offset) || offset < 0) {
      return res.status(400).json({
        message: "Offset must be a non-negative integer",
        code: "INVALID_OFFSET",
      });
    }

    const meilisearchService =
      req.scope.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);

    const results = await meilisearchService.search(
      query.trim(),
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
