import { z } from "@medusajs/framework/zod";

/**
 * GET /store-api/search
 * - q: keyword (required)
 * - hybridEmbedder: optional; omit → semantic ratio 0.5 + embedder "default";
 *   "default" → same; numeric string in [0,1] → that ratio + embedder "default"
 */
export const StoreSearchQuery = z
  .object({
    q: z
      .string()
      .min(1, "q is required")
      .transform((val) => val.trim()),
    hybridEmbedder: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hybridEmbedder === undefined || data.hybridEmbedder === "") {
      return;
    }
    const v = data.hybridEmbedder.trim();
    if (v.toLowerCase() === "default") {
      return;
    }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "hybridEmbedder must be 'default' or a decimal between 0 and 1 (e.g. 0.5)",
        path: ["hybridEmbedder"],
      });
    }
  })
  .transform(({ q, hybridEmbedder }) => {
    let semanticRatio = 0.5;
    const embedder = "default";
    if (hybridEmbedder !== undefined && hybridEmbedder !== "") {
      const v = hybridEmbedder.trim();
      if (v.toLowerCase() !== "default") {
        semanticRatio = Number(v);
      }
    }
    return {
      q,
      hybrid: { embedder, semanticRatio },
    };
  });

export type StoreSearchQueryParams = z.infer<typeof StoreSearchQuery>;
