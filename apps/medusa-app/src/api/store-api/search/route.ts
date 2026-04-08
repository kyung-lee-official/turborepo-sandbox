import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MEILISEARCH_MODULE } from "@/modules/meilisearch";
import type MeilisearchModuleService from "@/modules/meilisearch/service";
import type { StoreSearchQueryParams } from "./validators";

/**
 * GET /store-api/search?q=...&hybridEmbedder=0.5|default
 * Hybrid / vector-blended product search against the configured product index.
 */
export async function GET(
  req: MedusaRequest<unknown, StoreSearchQueryParams>,
  res: MedusaResponse,
): Promise<void> {
  const logger = req.scope.resolve("logger");
  const { q, hybrid } = req.validatedQuery;

  try {
    const meilisearchService =
      req.scope.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);

    const results = await meilisearchService.search(
      q,
      {
        hybrid,
      },
      "product",
    );

    res.json({
      query: q,
      hybrid,
      pagination: {
        limit: results.limit ?? 20,
        offset: results.offset ?? 0,
        total: results.estimatedTotalHits ?? 0,
      },
      hits: results.hits ?? [],
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
