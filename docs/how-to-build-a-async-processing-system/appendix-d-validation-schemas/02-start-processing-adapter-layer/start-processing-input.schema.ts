/**
 * Appendix D — Layer 2: Start processing adapter Zod schemas.
 */

import { z } from "zod";

import { sourceLocatorSchema } from "../shared/source-locator.schema";

export const uploadSourceEntrySchema = z.object({
  sourceId: z.string().min(1),
  originalName: z.string(),
  mimeType: z.string().optional(),
  locator: sourceLocatorSchema,
});

/**
 * POST /app/async-processing/start — session id only.
 * .strict() rejects client-supplied sources or context.
 */
export const startApiBodySchema = z
  .object({
    uploadSessionId: z.string().min(1),
    domainKind: z.string().min(1).optional(),
  })
  .strict();

/**
 * In-process auto-start event payload (processing.start-requested).
 * Trusted because upload ingest built sources server-side.
 */
export const processingStartRequestedSchema = z.object({
  domainKind: z.string().min(1),
  sources: z.record(z.string(), uploadSourceEntrySchema),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type StartApiBody = z.infer<typeof startApiBodySchema>;

export type ProcessingStartRequestedPayload = z.infer<
  typeof processingStartRequestedSchema
>;
