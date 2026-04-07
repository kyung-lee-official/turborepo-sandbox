import z from "zod";

export const payPalCustomerDisputeResolvedWebhookEventSchema = z
  .object({
    event_type: z.literal("CUSTOMER.DISPUTE.RESOLVED"),
    resource: z.record(z.string(), z.unknown()),
  })
  .passthrough();
