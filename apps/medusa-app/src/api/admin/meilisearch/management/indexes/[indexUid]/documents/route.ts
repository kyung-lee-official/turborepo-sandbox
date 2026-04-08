import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MEILISEARCH_MODULE } from "@/modules/meilisearch";
import type MeilisearchModuleService from "@/modules/meilisearch/service";
import {
  AdminMeilisearchDocumentsBody,
  type AdminMeilisearchDocumentsQueryType,
} from "../../../validators";

function toDocumentsQuery(q: AdminMeilisearchDocumentsQueryType) {
  const query: {
    limit?: number;
    offset?: number;
    fields?: string[];
    filter?: string;
    retrieveVectors?: boolean;
  } = {};
  if (q.limit !== undefined) query.limit = q.limit;
  if (q.offset !== undefined) query.offset = q.offset;
  if (q.filter !== undefined) query.filter = q.filter;
  if (q.retrieveVectors !== undefined)
    query.retrieveVectors = q.retrieveVectors;
  if (q.fields !== undefined && q.fields.length > 0) query.fields = q.fields;
  return query;
}

/**
 * GET /admin/meilisearch/management/indexes/:indexUid/documents
 */
export async function GET(
  req: MedusaRequest<unknown, AdminMeilisearchDocumentsQueryType>,
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
    const documents = await meilisearchService.getDocumentsForIndex(
      indexUid,
      toDocumentsQuery(req.validatedQuery),
    );
    res.status(200).json(documents);
  } catch (error) {
    logger.error(
      "Meilisearch list documents failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: "Failed to list Meilisearch documents",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * POST /admin/meilisearch/management/indexes/:indexUid/documents
 * Maps to Meilisearch POST /indexes/{uid}/documents with primaryKey=id.
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

  const parsed = AdminMeilisearchDocumentsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Request body must be a JSON array of documents",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const task = await meilisearchService.addOrReplaceDocumentsForIndex(
      indexUid,
      parsed.data,
    );
    res.status(202).json(task);
  } catch (error) {
    logger.error(
      "Meilisearch add/replace documents failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: "Failed to add or replace Meilisearch documents",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * DELETE /admin/meilisearch/management/indexes/:indexUid/documents
 * Deletes all documents in the index.
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
    const task = await meilisearchService.deleteAllDocumentsForIndex(indexUid);
    res.status(202).json(task);
  } catch (error) {
    logger.error(
      "Meilisearch delete all documents failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: "Failed to delete all Meilisearch documents",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
