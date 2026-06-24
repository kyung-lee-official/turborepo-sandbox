import { z } from "zod";

export const sourceLocatorSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("local"),
    path: z.string().min(1),
    declaredSizeBytes: z.number().int().nonnegative().optional(),
  }),
  z.object({
    kind: z.literal("object"),
    provider: z.enum(["s3", "cos"]),
    bucket: z.string().min(1),
    key: z.string().min(1),
    declaredSizeBytes: z.number().int().nonnegative().optional(),
  }),
]);

export const uploadSourceEntrySchema = z.object({
  sourceId: z.string().min(1),
  originalName: z.string(),
  mimeType: z.string().optional(),
  locator: sourceLocatorSchema,
});

/** POST .../start — session id only; rejects unknown keys (e.g. client sources) */
export const startApiBodySchema = z
  .object({
    uploadSessionId: z.string().min(1),
    domainKind: z.string().min(1).optional(),
  })
  .strict();

/** Event path only — in-process payload from ingest */
export const processingStartRequestedSchema = z.object({
  domainKind: z.string().min(1),
  sources: z.record(z.string(), uploadSourceEntrySchema),
  context: z.record(z.string(), z.unknown()).optional(),
});
