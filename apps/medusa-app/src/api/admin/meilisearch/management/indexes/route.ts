import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MEILISEARCH_MODULE } from "@/modules/meilisearch";
import type MeilisearchModuleService from "@/modules/meilisearch/service";
import type {
  AdminMeilisearchCreateIndexBodyType,
  AdminMeilisearchIndexesQueryType,
} from "../validators";

/**
 * GET /admin/meilisearch/management/indexes
 */
export async function GET(
  req: MedusaRequest<unknown, AdminMeilisearchIndexesQueryType>,
  res: MedusaResponse,
): Promise<void> {
  const logger = req.scope.resolve("logger");
  const meilisearchService =
    req.scope.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);
  const q = req.validatedQuery;

  try {
    const indexes = await meilisearchService.listIndexesRaw({
      limit: q.limit,
      offset: q.offset,
    });
    res.status(200).json(indexes);
  } catch (error) {
    logger.error(
      "Meilisearch list indexes failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: "Failed to list Meilisearch indexes",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * POST /admin/meilisearch/management/indexes
 */
export async function POST(
  req: MedusaRequest<AdminMeilisearchCreateIndexBodyType>,
  res: MedusaResponse,
): Promise<void> {
  const logger = req.scope.resolve("logger");
  const meilisearchService =
    req.scope.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);
  const { uid, primaryKey } = req.validatedBody;

  try {
    const task = await meilisearchService.createIndex(uid, { primaryKey });
    res.status(202).json(task);
  } catch (error) {
    logger.error(
      "Meilisearch create index failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: "Failed to create Meilisearch index",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
