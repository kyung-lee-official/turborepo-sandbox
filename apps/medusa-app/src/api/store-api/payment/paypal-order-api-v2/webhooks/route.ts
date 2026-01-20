import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { HttpError, type PayPalWebhookEvent } from "@repo/types";
import { verifyWebhookSignature } from "./verify-webhook-signature";

/**
 * If PayPal webhook failed to hit this endpoint, PayPal marks the webhook event as FAIL_SOFT, 
 * and will retry sending the webhook event for a certain period of time (typically around 1 minute).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as PayPalWebhookEvent;
  try {
    const isValid = await verifyWebhookSignature(
      req.headers as Record<string, string>,
      req.body,
    );
    if (!isValid) {
      throw new HttpError("PAYMENT.PAYPAL_INVALID_WEBHOOK_SIGNATURE");
    }
    switch (body.event_type) {
      case "CHECKOUT.ORDER.APPROVED":
        break;
      case "PAYMENT.AUTHORIZATION.CREATED":
        break;
      case "PAYMENT.CAPTURE.COMPLETED":
        break;
      default:
        /* ignore unknown event types */
        break;
    }
    console.log(body.event_type);
    res.status(200).send({ status: "Webhook received and verified" });
    return;
  } catch (error) {
    throw new HttpError(
      "PAYMENT.PAYPAL_INVALID_WEBHOOK_SIGNATURE",
      "Caution, invalid PayPal webhook signature",
      error,
    );
  }
}
