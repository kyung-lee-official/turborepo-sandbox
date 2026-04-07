import z from "zod";

export const payPalCaptureReversedWebhookEventSchema = z
  .object({
    event_type: z.literal("PAYMENT.CAPTURE.REVERSED"),
    resource: z.record(z.string(), z.unknown()),
  })
  .passthrough();
