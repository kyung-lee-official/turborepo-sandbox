import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { HttpError } from "@repo/types";
import { verifyWebhookSignature } from "./verify-webhook-signature";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const isValid = await verifyWebhookSignature(
      req.headers as Record<string, string>,
      req.body,
    );
    if (!isValid) {
      throw new HttpError("PAYMENT.PAYPAL_INVALID_WEBHOOK_SIGNATURE");
    }
    res.send({ status: "Webhook received and verified" });
  } catch (error) {
    throw new HttpError("PAYMENT.PAYPAL_INVALID_WEBHOOK_SIGNATURE");
  }
  return;
}
