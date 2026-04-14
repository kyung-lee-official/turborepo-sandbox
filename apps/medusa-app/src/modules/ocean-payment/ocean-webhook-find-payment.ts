/**
 * Locate Medusa payments created by Hosted Checkout (`sendTrade`), for `noticeUrl` handling.
 *
 * Default Medusa `payment.provider_id` for `{ resolve: "./src/modules/ocean-payment", id: "oceanpayment" }`.
 */
export const OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID =
  process.env.OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID ??
  "pp_oceanpayment_oceanpayment";

type PaymentRow = { id: string; data: Record<string, unknown> };

type GraphQuery = {
  graph: (args: unknown) => Promise<{ data: PaymentRow[] }>;
};

export async function findOceanPaymentByOrderNumber(
  query: GraphQuery,
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
