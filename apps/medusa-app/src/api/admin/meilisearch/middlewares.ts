import {
  authenticate,
  type MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http";
import {
  AdminMeilisearchCreateIndexBody,
  AdminMeilisearchDocumentsQuery,
  AdminMeilisearchIndexesQuery,
  adminMeilisearchDocumentsQueryConfig,
  adminMeilisearchIndexesQueryConfig,
} from "./management/validators";

/**
 * Admin-only (Medusa `user` actor) routes for Meilisearch sync and management.
 */
export const adminMeilisearchRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/meilisearch/sync",
    middlewares: [authenticate("user", ["session", "bearer"])],
  },
  {
    method: ["GET"],
    matcher: "/admin/meilisearch/management/tasks",
    middlewares: [authenticate("user", ["session", "bearer"])],
  },
  {
    method: ["GET"],
    matcher: "/admin/meilisearch/management/indexes",
    middlewares: [
      authenticate("user", ["session", "bearer"]),
      validateAndTransformQuery(
        AdminMeilisearchIndexesQuery,
        adminMeilisearchIndexesQueryConfig,
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/meilisearch/management/indexes",
    middlewares: [
      authenticate("user", ["session", "bearer"]),
      validateAndTransformBody(AdminMeilisearchCreateIndexBody),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/meilisearch/management/indexes/:indexUid/embedders",
    middlewares: [authenticate("user", ["session", "bearer"])],
  },
  {
    method: ["PATCH"],
    matcher: "/admin/meilisearch/management/indexes/:indexUid/embedders",
    middlewares: [authenticate("user", ["session", "bearer"])],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/meilisearch/management/indexes/:indexUid/embedders",
    middlewares: [authenticate("user", ["session", "bearer"])],
  },
  {
    method: ["GET"],
    matcher: "/admin/meilisearch/management/indexes/:indexUid/documents",
    middlewares: [
      authenticate("user", ["session", "bearer"]),
      validateAndTransformQuery(
        AdminMeilisearchDocumentsQuery,
        adminMeilisearchDocumentsQueryConfig,
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/meilisearch/management/indexes/:indexUid/documents",
    middlewares: [authenticate("user", ["session", "bearer"])],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/meilisearch/management/indexes/:indexUid/documents",
    middlewares: [authenticate("user", ["session", "bearer"])],
  },
];
