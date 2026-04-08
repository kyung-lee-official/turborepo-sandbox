import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MEILISEARCH_MODULE } from "@/modules/meilisearch";
import type MeilisearchModuleService from "@/modules/meilisearch/service";

const LATEST_TASKS_LIMIT = 3;

/**
 * GET /admin/meilisearch/management/tasks
 * Latest Meilisearch tasks (newest first, hard-capped at 3).
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const logger = req.scope.resolve("logger");
  const meilisearchService =
    req.scope.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);

  try {
    const tasks = await meilisearchService.listLatestTasks(LATEST_TASKS_LIMIT);
    res.status(200).json({
      ...tasks,
      results: (tasks.results ?? []).slice(0, LATEST_TASKS_LIMIT),
    });
  } catch (error) {
    logger.error(
      "Meilisearch list tasks failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: "Failed to list Meilisearch tasks",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
