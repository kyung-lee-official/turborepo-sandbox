import { OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID } from "./config";

/**
 * Locate Medusa payments created by Hosted Checkout (`sendTrade`), for `noticeUrl` handling.
 *
 * Default Medusa `payment.provider_id` for `{ resolve: "./src/modules/ocean-payment", id: "oceanpayment" }`.
 */

type PaymentRow = { id: string; data: Record<string, unknown> };

/** Minimal payment session row for `noticeUrl` handling (match PayPal webhook pattern). */
type OceanWebhookPaymentSessionRow = {
  id: string;
  data: Record<string, unknown>;
  context?: Record<string, unknown> | null;
};

/** Type compatible with the query object returned by ContainerRegistrationKeys.QUERY */
type RemoteQuery = {
  graph: (args: {
    entity: string;
    fields: string[];
    filters?: Record<string, unknown>;
  }) => Promise<{ data: unknown[] }>;
};

export async function findOceanPaymentSessionByOrderNumber(
  query: RemoteQuery,
  orderNumber: string,
): Promise<OceanWebhookPaymentSessionRow | null> {
  const { data } = (await query.graph({
    entity: "payment_session",
    fields: ["id", "data", "context"],
    filters: {
      provider_id: OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID,
      data: {
        order_number: orderNumber,
      },
    },
  })) as { data: OceanWebhookPaymentSessionRow[] };

  return data[0] ?? null;
}

export async function findOceanPaymentByOrderNumber(
  query: RemoteQuery,
  orderNumber: string,
): Promise<PaymentRow | null> {
  const { data } = (await query.graph({
    entity: "payment",
    fields: ["id", "data"],
    filters: {
      provider_id: OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID,
      data: {
        order_number: orderNumber,
      },
    },
  })) as { data: PaymentRow[] };

  return data[0] ?? null;
}
