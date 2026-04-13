import type { StoreCartAddress } from "@medusajs/framework/types";

/**
 * Optional fields your storefront can pass when initializing a payment session
 * (merged with cart shipping address where applicable).
 */
export type OceanPaymentInitiateSessionData = {
  /** Official method name; default `Credit Card`. */
  methods?: string;
  billing_firstName?: string;
  billing_lastName?: string;
  billing_email?: string;
  billing_phone?: string;
  billing_country?: string;
  billing_state?: string;
  billing_city?: string;
  billing_address?: string;
  billing_zip?: string;
  billing_ip?: string;
  productName?: string;
  productSku?: string;
  productNum?: string;
  productPrice?: string;
  order_notes?: string;
};

/** Parsed fields from `sendTrade` XML (Merchant Control Redirect). */
export type OceanPaymentSendTradeResponse = {
  account: string;
  terminal: string;
  signValue: string;
  order_number: string;
  order_currency: string;
  order_amount: string;
  order_notes: string;
  payment_id: string;
  pay_url: string;
  pay_results: string;
  pay_details: string;
};

/**
 * Payload you should POST into Medusa `authorizePayment` after validating
 * the synchronous `backUrl` signature on your own route.
 * @see https://dev.oceanpayment.com/en/docs/payment/parameter
 */
export type OceanPaymentBackUrlPayload = {
  payment_id: string;
  payment_status: string;
  order_number?: string;
  order_currency?: string;
  order_amount?: string;
  payment_details?: string;
  [key: string]: unknown;
};

export type OceanPaymentSessionData = OceanPaymentSendTradeResponse & {
  pay_url: string;
};

export function pickXmlTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1]?.trim() ?? "";
}

export function buildBillingFromCart(
  shipping: StoreCartAddress | null | undefined,
  overrides: OceanPaymentInitiateSessionData,
  customerEmailFromCart?: string | null,
): {
  billing_firstName: string;
  billing_lastName: string;
  billing_email: string;
  billing_phone: string;
  billing_country: string;
  billing_state: string;
  billing_city: string;
  billing_address: string;
  billing_zip: string;
} {
  const addr = shipping as Record<string, string | null | undefined> | null;
  const first =
    overrides.billing_firstName ??
    addr?.first_name ??
    addr?.firstName ??
    "Customer";
  const last =
    overrides.billing_lastName ??
    addr?.last_name ??
    addr?.lastName ??
    "Unknown";
  const email =
    overrides.billing_email ??
    addr?.email ??
    (customerEmailFromCart?.trim() || "");
  return {
    billing_firstName: first,
    billing_lastName: last,
    billing_email: email,
    billing_phone: overrides.billing_phone ?? addr?.phone ?? "",
    billing_country:
      overrides.billing_country ?? addr?.country_code?.toUpperCase() ?? "US",
    billing_state:
      overrides.billing_state ?? addr?.province ?? addr?.state ?? "NA",
    billing_city: overrides.billing_city ?? addr?.city ?? "",
    billing_address:
      overrides.billing_address ?? addr?.address_1 ?? addr?.address1 ?? "",
    billing_zip:
      overrides.billing_zip ?? addr?.postal_code ?? addr?.postalCode ?? "",
  };
}
