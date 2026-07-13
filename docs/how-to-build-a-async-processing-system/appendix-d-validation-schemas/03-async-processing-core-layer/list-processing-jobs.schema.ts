/**
 * Appendix D — Layer 3: Processing HTTP query validation.
 */

import { z } from "zod";

const processingPhaseSchema = z.enum([
  "queued",
  "processing",
  "complete",
  "failed",
]);

function parsePhaseQuery(
  value: string | undefined,
): z.infer<typeof processingPhaseSchema>[] | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const phases = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (phases.length === 0) {
    return undefined;
  }
  return z.array(processingPhaseSchema).parse(phases);
}

/** GET jobs query params */
export const listProcessingJobsQuerySchema = z.object({
  phase: z.string().optional().transform(parsePhaseQuery),
  domainKind: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

export type ListProcessingJobsQuery = z.infer<
  typeof listProcessingJobsQuerySchema
>;
