/**
 * Appendix D — shared Zod schemas used across layers.
 */

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

export type SourceLocatorInput = z.infer<typeof sourceLocatorSchema>;
