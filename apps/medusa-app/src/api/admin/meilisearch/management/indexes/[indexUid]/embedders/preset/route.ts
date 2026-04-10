import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MEILISEARCH_MODULE } from "@/modules/meilisearch";
import type MeilisearchModuleService from "@/modules/meilisearch/service";

/**
 * POST /admin/meilisearch/management/indexes/:indexUid/embedders/preset
 * Applies the built-in REST embedder preset (Ollama bge-m3 @ 127.0.0.1:11434).
 */
export async function POST(
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
    const task =
      await meilisearchService.applyRestOllamaBgeEmbedderPreset(indexUid);
    res.status(202).json(task);
  } catch (error) {
    logger.error(
      "Meilisearch apply preset embedders failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: "Failed to apply preset Meilisearch embedders",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
