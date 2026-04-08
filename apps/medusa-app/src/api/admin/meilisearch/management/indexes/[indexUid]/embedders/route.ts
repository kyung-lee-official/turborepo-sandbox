import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MEILISEARCH_MODULE } from "@/modules/meilisearch";
import type MeilisearchModuleService from "@/modules/meilisearch/service";
import { AdminMeilisearchEmbeddersBody } from "../../../validators";

/**
 * GET /admin/meilisearch/management/indexes/:indexUid/embedders
 */
export async function GET(
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
    const embedders = await meilisearchService.getEmbeddersForIndex(indexUid);
    res.status(200).json(embedders);
  } catch (error) {
    logger.error(
      "Meilisearch get embedders failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: "Failed to get Meilisearch embedders",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * PATCH /admin/meilisearch/management/indexes/:indexUid/embedders
 */
export async function PATCH(
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

  const parsed = AdminMeilisearchEmbeddersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid embedders payload",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const task = await meilisearchService.updateEmbeddersForIndex(
      indexUid,
      parsed.data,
    );
    res.status(202).json(task);
  } catch (error) {
    logger.error(
      "Meilisearch update embedders failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: "Failed to update Meilisearch embedders",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * DELETE /admin/meilisearch/management/indexes/:indexUid/embedders
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
    const task = await meilisearchService.resetEmbeddersForIndex(indexUid);
    res.status(202).json(task);
  } catch (error) {
    logger.error(
      "Meilisearch reset embedders failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: "Failed to reset Meilisearch embedders",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
