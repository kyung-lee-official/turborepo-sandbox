import { z } from "@medusajs/framework/zod";

export const AdminMeilisearchCreateIndexBody = z.object({
  uid: z.string().min(1),
  primaryKey: z.string().min(1).optional().default("id"),
});

export type AdminMeilisearchCreateIndexBodyType = z.infer<
  typeof AdminMeilisearchCreateIndexBody
>;

/** PATCH body matches Meilisearch embedders object (e.g. `{ default: { source: "openAi", ... } }`). */
export const AdminMeilisearchEmbeddersBody = z.record(z.string(), z.unknown());

export const AdminMeilisearchDocumentsBody = z
  .array(z.record(z.string(), z.unknown()))
  .min(1);

export const AdminMeilisearchDocumentsQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(1000).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    fields: z.string().optional(),
    filter: z.string().optional(),
    retrieveVectors: z.preprocess((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return undefined;
    }, z.boolean().optional()),
  })
  .transform((q) => ({
    limit: q.limit,
    offset: q.offset,
    filter: q.filter,
    retrieveVectors: q.retrieveVectors,
    ...(q.fields
      ? {
          fields: q.fields
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }
      : {}),
  }));

export type AdminMeilisearchDocumentsQueryType = z.infer<
  typeof AdminMeilisearchDocumentsQuery
>;

export const adminMeilisearchDocumentsQueryConfig = {
  defaults: [],
  isList: false,
};

export const AdminMeilisearchIndexesQuery = z.object({
  limit: z.coerce.number().int().min(1).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type AdminMeilisearchIndexesQueryType = z.infer<
  typeof AdminMeilisearchIndexesQuery
>;

export const adminMeilisearchIndexesQueryConfig = {
  defaults: [],
  isList: false,
};
