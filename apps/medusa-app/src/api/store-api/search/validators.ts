import { z } from "@medusajs/framework/zod";

export const StoreSearch = z.object({
  query: z
    .string()
    .min(1, "Search query is required and must be a non-empty string")
    .transform((val) => val.trim()),
  limit: z
    .number()
    .int()
    .min(1, "Limit must be an integer between 1 and 100")
    .max(100, "Limit must be an integer between 1 and 100")
    .optional()
    .default(20),
  offset: z
    .number()
    .int()
    .min(0, "Offset must be a non-negative integer")
    .optional()
    .default(0),
  filter: z.array(z.string()).optional(),
});

export type StoreSearchRequest = z.infer<typeof StoreSearch>;
