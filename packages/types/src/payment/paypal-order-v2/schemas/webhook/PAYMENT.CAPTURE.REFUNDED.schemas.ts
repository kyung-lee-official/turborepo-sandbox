import z from "zod";

export const payPalCaptureRefundedWebhookEventSchema = z
  .object({
    event_type: z.literal("PAYMENT.CAPTURE.REFUNDED"),
    resource: z.record(z.string(), z.unknown()),
  })
  .passthrough();
