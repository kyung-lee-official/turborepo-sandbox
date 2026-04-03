import { z } from "@medusajs/framework/zod";

export const StoreCreatePaymentSessions = z
  .object({
    cart_id: z.string().min(1),
    provider_id: z.string().min(1),
    data: z.record(z.unknown()).optional(),
  })
  .strict();

export type StoreCreatePaymentSessionsType = z.infer<
  typeof StoreCreatePaymentSessions
>;
