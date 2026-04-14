import type { StoreCartAddress } from "@medusajs/framework/types";

/**
 * OceanPayment **Hosted Checkout** only (`sendTrade` / hosted payment page).
 * @see https://dev.oceanpayment.com/en/docs/payment/introduction
 * @see https://dev.oceanpayment.com/en/docs/payment/host-page/integration
 *
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
 * Hosted Checkout browser return — payload to pass into Medusa `authorizePayment` after you verify
 * synchronous `backUrl` POST signature on your own route.
 * @see https://dev.oceanpayment.com/en/docs/payment/host-page/integration
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

/** Cart lines passed from `initialize-payment-session` into provider context. */
export type OceanPaymentCartLineInput = {
  title?: string | null;
  product_title?: string | null;
  quantity?: number | string | null;
  variant_sku?: string | null;
  /** Medusa line total; typically minor units (e.g. cents). */
  total?: number | string | null;
};

/**
 * Maps cart lines to Ocean comma-separated product fields.
 * When `OCEANPAYMENT_LINE_AMOUNTS_MINOR_UNITS` is not `"false"`, `total` is divided by 100 for display.
 */
export function buildOceanProductFieldsFromCartLines(
  lines: OceanPaymentCartLineInput[] | null | undefined,
  fallback: {
    productName: string;
    productNum: string;
    productSku: string;
    productPrice: string;
  },
  /** Used when a line has no `total` (same as collection amount for single-line fallback). */
  priceWhenLineTotalMissing?: string,
): {
  productName: string;
  productNum: string;
  productSku: string;
  productPrice: string;
} {
  if (!lines?.length) {
    return fallback;
  }

  const minorUnits =
    (process.env.OCEANPAYMENT_LINE_AMOUNTS_MINOR_UNITS ?? "true")
      .trim()
      .toLowerCase() !== "false";

  const names: string[] = [];
  const nums: string[] = [];
  const skus: string[] = [];
  const prices: string[] = [];

  for (const line of lines) {
    const rawName = line.product_title ?? line.title ?? "Item";
    const name = String(rawName).replace(/,/g, " ").trim() || "Item";
    const qtyNum = Number(line.quantity ?? 1);
    const qty = Number.isFinite(qtyNum) && qtyNum > 0 ? Math.floor(qtyNum) : 1;
    const skuRaw = line.variant_sku != null ? String(line.variant_sku) : "";
    const sku = skuRaw.replace(/,/g, " ").trim() || "#item";

    let priceStr = priceWhenLineTotalMissing?.trim() || fallback.productPrice;
    if (line.total != null && line.total !== "") {
      const raw = Number(line.total);
      if (Number.isFinite(raw)) {
        const major = minorUnits ? raw / 100 : raw;
        priceStr = major.toFixed(2);
      }
    }

    names.push(name);
    nums.push(String(qty));
    skus.push(sku);
    prices.push(priceStr);
  }

  return {
    productName: names.join(","),
    productNum: nums.join(","),
    productSku: skus.join(","),
    productPrice: prices.join(","),
  };
}

export function pickXmlTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1]?.trim() ?? "";
}

export function mergeOceanNoticeIntoPaymentData(
  paymentData: Record<string, unknown> | undefined,
  notice: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...(paymentData ?? {}),
    last_ocean_notice: {
      ...notice,
      recorded_at: new Date().toISOString(),
    },
  };
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
