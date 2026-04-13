/**
 * OceanPayment gateway base URL (sandbox vs production).
 * @see https://dev.oceanpayment.com/en/docs/payment/host-page/integration
 */

export function getOceanPaymentGatewayBaseUrl(): string {
  if (process.env.OCEANPAYMENT_GATEWAY_BASE_URL) {
    return process.env.OCEANPAYMENT_GATEWAY_BASE_URL.replace(/\/$/, "");
  }
  const production = process.env.NODE_ENV === "production";
  return production
    ? "https://secure.oceanpayment.com"
    : "https://test-secure.oceanpayment.com";
}

export const OceanPaymentConfig = {
  getGatewayBaseUrl: getOceanPaymentGatewayBaseUrl,

  sendTradePath: "/gateway/service/sendTrade",
} as const;
