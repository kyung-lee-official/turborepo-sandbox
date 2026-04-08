import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /admin/meilisearch/sync
 * Manually trigger product synchronization to Meilisearch.
 * Emits "meilisearch.sync" event which is handled by the subscriber.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const eventBus = req.scope.resolve(Modules.EVENT_BUS);
  const logger = req.scope.resolve("logger");

  try {
    logger.info("Meilisearch sync: Sync request received");
    await eventBus.emit({
      name: "meilisearch.sync",
      data: {},
    });
    res.json({
      message: "Product synchronization to Meilisearch has been initiated",
      status: "pending",
    });
  } catch (error) {
    logger.error(
      "Meilisearch sync: Failed to emit sync event",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: "Failed to initiate synchronization",
    });
  }
}
