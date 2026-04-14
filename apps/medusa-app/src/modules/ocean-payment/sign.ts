/**
 * Signature helpers for OceanPayment **Hosted Checkout** (`sendTrade`, response XML, `noticeUrl`).
 * @see https://dev.oceanpayment.com/en/docs/payment/introduction
 */
import { createHash } from "node:crypto";

/**
 * Mirrors Oceanpayment's special-character handling for signature fields.
 * @see https://dev.oceanpayment.com/en/docs/compliance-and-security/sign/introduction
 */
export function oceanSanitizeForSign(value: string): string {
  let s = value.trim();
  s = s.replace(/</g, " ");
  s = s.replace(/>/g, " ");
  s = s.replace(/'/g, " ");
  s = s.replace(/"/g, " ");
  return s;
}

function sha256Hex(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

/**
 * Hosted Checkout — Merchant Control Redirect — request signature.
 * account + terminal + backUrl + order_number + order_currency + order_amount +
 * billing_firstName + billing_lastName + billing_email + secureCode
 * @see https://dev.oceanpayment.com/en/docs/compliance-and-security/sign/payment
 */
export function buildHostedCheckoutRequestSignValue(input: {
  account: string;
  terminal: string;
  backUrl: string;
  order_number: string;
  order_currency: string;
  order_amount: string;
  billing_firstName: string;
  billing_lastName: string;
  billing_email: string;
  secureCode: string;
}): string {
  const concat =
    oceanSanitizeForSign(input.account) +
    oceanSanitizeForSign(input.terminal) +
    oceanSanitizeForSign(input.backUrl) +
    oceanSanitizeForSign(input.order_number) +
    oceanSanitizeForSign(input.order_currency) +
    oceanSanitizeForSign(input.order_amount) +
    oceanSanitizeForSign(input.billing_firstName) +
    oceanSanitizeForSign(input.billing_lastName) +
    oceanSanitizeForSign(input.billing_email) +
    oceanSanitizeForSign(input.secureCode);

  return sha256Hex(concat);
}

/**
 * Hosted Checkout — Merchant Control Redirect — verify `sendTrade` XML response.
 * account + terminal + order_number + order_currency + order_amount + order_notes +
 * payment_id + pay_url + pay_results + pay_details + secureCode
 */
export function buildHostedCheckoutSendTradeResponseSignValue(input: {
  account: string;
  terminal: string;
  order_number: string;
  order_currency: string;
  order_amount: string;
  order_notes: string;
  payment_id: string;
  pay_url: string;
  pay_results: string;
  pay_details: string;
  secureCode: string;
}): string {
  const concat =
    oceanSanitizeForSign(input.account) +
    oceanSanitizeForSign(input.terminal) +
    oceanSanitizeForSign(input.order_number) +
    oceanSanitizeForSign(input.order_currency) +
    oceanSanitizeForSign(input.order_amount) +
    oceanSanitizeForSign(input.order_notes) +
    oceanSanitizeForSign(input.payment_id) +
    oceanSanitizeForSign(input.pay_url) +
    oceanSanitizeForSign(input.pay_results) +
    oceanSanitizeForSign(input.pay_details) +
    oceanSanitizeForSign(input.secureCode);

  return sha256Hex(concat);
}

export function oceanSignValuesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Hosted Checkout — server async notification (`noticeUrl`) signature verification.
 * (Same string as Ocean’s “Payments” row for transaction webhooks after `sendTrade`.)
 * account + terminal + order_number + order_currency + order_amount + order_notes +
 * card_number + payment_id + payment_authType + payment_status + payment_details + payment_risk + secureCode
 * @see https://dev.oceanpayment.com/en/docs/payment/introduction (Hosted Checkout)
 * @see https://dev.oceanpayment.com/en/docs/webhook/payments/checkout
 */
export function buildHostedCheckoutNoticeUrlSignValue(input: {
  account: string;
  terminal: string;
  order_number: string;
  order_currency: string;
  order_amount: string;
  order_notes: string;
  card_number: string;
  payment_id: string;
  payment_authType: string;
  payment_status: string;
  payment_details: string;
  payment_risk: string;
  secureCode: string;
}): string {
  const concat =
    oceanSanitizeForSign(input.account) +
    oceanSanitizeForSign(input.terminal) +
    oceanSanitizeForSign(input.order_number) +
    oceanSanitizeForSign(input.order_currency) +
    oceanSanitizeForSign(input.order_amount) +
    oceanSanitizeForSign(input.order_notes) +
    oceanSanitizeForSign(input.card_number) +
    oceanSanitizeForSign(input.payment_id) +
    oceanSanitizeForSign(input.payment_authType) +
    oceanSanitizeForSign(input.payment_status) +
    oceanSanitizeForSign(input.payment_details) +
    oceanSanitizeForSign(input.payment_risk) +
    oceanSanitizeForSign(input.secureCode);

  return sha256Hex(concat);
}
