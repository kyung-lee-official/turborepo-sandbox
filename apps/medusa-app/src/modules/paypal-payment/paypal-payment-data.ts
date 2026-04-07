import type { PayPalAuthorizePaymentResponse } from "@repo/types";

/** Payment `data` after capture may include PayPal's capture API response under context. */
export type PayPalPaymentData = PayPalAuthorizePaymentResponse & {
  context?: {
    captureOrderData?: {
      id?: string;
      amount?: { currency_code: string; value: string };
    };
    idempotency_key?: string;
  };
};

export function getPayPalCaptureIdFromPaymentData(
  data: PayPalPaymentData | undefined | null,
): string | undefined {
  if (!data) {
    return undefined;
  }
  const fromOrderCapture = data.context?.captureOrderData?.id;
  if (fromOrderCapture) {
    return fromOrderCapture;
  }
  return data.purchase_units?.[0]?.payments?.captures?.[0]?.id;
}

/**
 * Merges PayPal refund/dispute/reversal webhook payloads into provider payment `data`.
 * Use for `CUSTOMER.DISPUTE.RESOLVED`, `PAYMENT.CAPTURE.REVERSED`, and (when not only logging)
 * dispute-related `PAYMENT.CAPTURE.REFUNDED`. Does not call PayPal APIs — unlike
 * {@link PayPalPaymentProviderService.refundPayment} for merchant-initiated refunds.
 */
export function mergePayPalWebhookRefundIntoProviderData(
  paymentData: Record<string, unknown> | undefined,
  input: { event_type: string; resource: Record<string, unknown> },
): Record<string, unknown> {
  return {
    ...(paymentData ?? {}),
    last_paypal_refund_webhook: {
      event_type: input.event_type,
      resource: input.resource,
      recorded_at: new Date().toISOString(),
    },
  };
}
