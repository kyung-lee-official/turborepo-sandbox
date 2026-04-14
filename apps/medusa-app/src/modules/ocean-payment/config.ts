/**
 * OceanPayment **Hosted Checkout** only (not Embedded, Server-to-Server, Payment Link, or POS).
 * @see https://dev.oceanpayment.com/en/docs/payment/introduction
 *
 * Gateway base URL (sandbox vs production) and Hosted Checkout redirect options.
 *
 * Environment (common):
 * - `OCEANPAYMENT_GATEWAY_BASE_URL` — optional override for sendTrade host.
 * - `OCEANPAYMENT_HOSTED_REDIRECT_MODE` — `merchant_control` (default) or `auto` /
 *   `oceanpayment_auto_redirect` (skip sendTrade XML signature verification per Ocean matrix).
 * - `OCEANPAYMENT_LINE_AMOUNTS_MINOR_UNITS` — default `true`; set `false` if cart line `total` is already major units.
 * - `OCEANPAYMENT_FALLBACK_BILLING_IP` — used when no `billing_ip` in session data or context.
 * - `OCEANPAYMENT_BACK_URL` — **Medusa** URL that accepts Ocean’s synchronous **POST** (form body), e.g.
 *   `{MEDUSA_BACKEND_URL}/hooks/payment/oceanpayment_oceanpayment/back`. Included in `sendTrade` request
 *   signing; do not point at a Next.js `page.tsx` (GET-only) URL.
 * - `OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE` — storefront URL (no query string) for **303** after a
 *   verified `backUrl` POST, e.g. `{NEXT_ORIGIN}/medusa/store-api/payment/oceanpayment/return`.
 * - `OCEANPAYMENT_NOTICE_URL` — set to `{MEDUSA_BACKEND_URL}/hooks/payment/oceanpayment_oceanpayment`.
 * - `OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID` — override if your DB provider id differs from `pp_oceanpayment_oceanpayment`
 *   (exported as `OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID` below).
 *
 * @see https://dev.oceanpayment.com/en/docs/payment/host-page/integration
 * @see https://dev.oceanpayment.com/en/docs/compliance-and-security/sign/payment (Hosted Checkout rows only)
 */

/** Medusa `payment` / `payment_session` `provider_id` for this module. */
export const OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID =
  process.env.OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID?.trim() ||
  "pp_oceanpayment_oceanpayment";

export function getOceanPaymentGatewayBaseUrl(): string {
  if (process.env.OCEANPAYMENT_GATEWAY_BASE_URL) {
    return process.env.OCEANPAYMENT_GATEWAY_BASE_URL.replace(/\/$/, "");
  }
  const production = process.env.NODE_ENV === "production";
  return production
    ? "https://secure.oceanpayment.com"
    : "https://test-secure.oceanpayment.com";
}

/**
 * Hosted checkout redirect mode per Ocean sign/payment matrix.
 * - `merchant_control`: verify `sendTrade` XML `signValue` (pay_url response).
 * - `auto` (`oceanpayment_auto_redirect`): real-time response verification is not
 *   the same per docs — skip XML signature check; still validate `pay_url` + `pay_results`.
 * @see https://dev.oceanpayment.com/en/docs/compliance-and-security/sign/payment
 */
export type OceanPaymentHostedRedirectMode =
  | "merchant_control"
  | "oceanpayment_auto_redirect";

export function getOceanPaymentHostedRedirectMode(): OceanPaymentHostedRedirectMode {
  const raw = (
    process.env.OCEANPAYMENT_HOSTED_REDIRECT_MODE ?? "merchant_control"
  )
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");

  if (
    raw === "auto" ||
    raw === "oceanpayment_auto_redirect" ||
    raw === "auto_redirect"
  ) {
    return "oceanpayment_auto_redirect";
  }
  return "merchant_control";
}

export const OceanPaymentConfig = {
  getGatewayBaseUrl: getOceanPaymentGatewayBaseUrl,

  getHostedRedirectMode: getOceanPaymentHostedRedirectMode,

  sendTradePath: "/gateway/service/sendTrade",
} as const;
