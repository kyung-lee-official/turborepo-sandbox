import { z } from "zod";

export const createPerformanceSchema = z
  .object({
    score: z.number().int().min(0).max(10),
    ownerId: z.string().toLowerCase(),
  })
  .required();

export type CreatePerformanceDto = z.infer<typeof createPerformanceSchema>;
