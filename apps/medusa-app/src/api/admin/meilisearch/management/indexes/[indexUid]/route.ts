import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MEILISEARCH_MODULE } from "@/modules/meilisearch";
import type MeilisearchModuleService from "@/modules/meilisearch/service";

/**
 * DELETE /admin/meilisearch/management/indexes/:indexUid
 * Removes the entire Meilisearch index (not only documents).
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const logger = req.scope.resolve("logger");
  const { indexUid } = req.params;
  const meilisearchService =
    req.scope.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);

  if (!indexUid) {
    res.status(400).json({ message: "indexUid is required" });
    return;
  }

  try {
    const task = await meilisearchService.deleteIndex(indexUid);
    res.status(202).json(task);
  } catch (error) {
    logger.error(
      "Meilisearch delete index failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: "Failed to delete Meilisearch index",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
