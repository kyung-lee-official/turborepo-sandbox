import type { Query } from "@medusajs/framework";
import type { PayPalAuthorizePaymentResponse } from "@repo/types";
import { getPayPalCaptureIdFromPaymentData } from "./paypal-payment-data";

/**
 * Default Medusa `payment.provider_id` for `medusa-config` provider `{ resolve: "./src/modules/paypal-payment", id: "paypal" }`.
 * Override with env `PAYPAL_MEDUSA_PAYMENT_PROVIDER_ID` if your deployment differs.
 */
const PAYPAL_MEDUSA_PAYMENT_PROVIDER_ID =
  process.env.PAYPAL_MEDUSA_PAYMENT_PROVIDER_ID ?? "pp_paypal_paypal";

type PaymentRow = { id: string; data: Record<string, unknown> };

/**
 * Locates the Medusa payment whose PayPal provider `data` matches a refund/dispute/reversal webhook.
 */
export async function findPayPalPaymentForRefundWebhook(
  query: Query,
  resource: Record<string, unknown>,
): Promise<PaymentRow | null> {
  const sup = resource.supplementary_data as
    | { related_ids?: { order_id?: string } }
    | undefined;
  const orderId = sup?.related_ids?.order_id;
  if (typeof orderId === "string" && orderId.length > 0) {
    const found = await findPaymentByPayPalOrderId(query, orderId);
    if (found) {
      return found;
    }
  }

  const disputed = resource.disputed_transactions as
    | Array<{
        reference_id?: string;
        seller_transaction_id?: string;
      }>
    | undefined;
  const refId = disputed?.[0]?.reference_id;
  if (typeof refId === "string" && refId.length > 0) {
    const found = await findPaymentByPayPalOrderId(query, refId);
    if (found) {
      return found;
    }
  }

  const captureCandidates: string[] = [];
  if (typeof resource.id === "string" && resource.id.length > 0) {
    captureCandidates.push(resource.id);
  }
  const sellerTx = disputed?.[0]?.seller_transaction_id;
  if (typeof sellerTx === "string" && sellerTx.length > 0) {
    captureCandidates.push(sellerTx);
  }
  if (captureCandidates.length === 0) {
    return null;
  }

  const { data: payments } = (await query.graph({
    entity: "payment",
    fields: ["id", "data"],
    filters: {
      provider_id: PAYPAL_MEDUSA_PAYMENT_PROVIDER_ID,
    },
  })) as { data: PaymentRow[] };

  for (const p of payments) {
    const cid = getPayPalCaptureIdFromPaymentData(
      p.data as PayPalAuthorizePaymentResponse,
    );
    if (cid && captureCandidates.includes(cid)) {
      return p;
    }
  }

  return null;
}

async function findPaymentByPayPalOrderId(
  query: Query,
  paypalOrderId: string,
): Promise<PaymentRow | null> {
  const { data } = (await query.graph({
    entity: "payment",
    fields: ["id", "data"],
    filters: {
      data: {
        id: paypalOrderId,
      },
    },
  })) as { data: PaymentRow[] };
  return data[0] ?? null;
}
