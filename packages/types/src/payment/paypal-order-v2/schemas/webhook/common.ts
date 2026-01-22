import z from "zod";

export const payPalSellerProtectionSchema = z.object({
  dispute_categories: z.array(z.string()),
  status: z.string(),
});
