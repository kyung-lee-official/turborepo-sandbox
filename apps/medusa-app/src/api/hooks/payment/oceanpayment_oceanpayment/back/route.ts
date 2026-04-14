import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  buildHostedCheckoutNoticeUrlSignValue,
  oceanSignValuesEqual,
} from "@/modules/ocean-payment/sign";

/**
 * Hosted Checkout synchronous `backUrl` (Merchant Control Redirect).
 * Ocean POSTs `application/x-www-form-urlencoded` fields; verify `signValue` per
 * https://dev.oceanpayment.com/en/docs/compliance-and-security/sign/payment
 * (same concatenation as `noticeUrl` in {@link buildHostedCheckoutNoticeUrlSignValue}).
 *
 * Then **303** redirect to `OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE` with an allowlisted
 * subset of fields as query parameters (never `signValue`; omit `card_number` from the URL).
 *
 * Set `OCEANPAYMENT_BACK_URL` to this route’s absolute URL, e.g.
 * `{MEDUSA_BACKEND_URL}/hooks/payment/oceanpayment_oceanpayment/back`
 */

/** Safe to append to the storefront redirect URL. */
const REDIRECT_QUERY_ALLOWLIST = new Set([
  "payment_id",
  "payment_status",
  "order_number",
  "order_currency",
  "order_amount",
  "order_notes",
  "methods",
  "payment_authType",
  "payment_details",
  "payment_risk",
  "account",
  "terminal",
  "response_type",
]);

function normalizeBody(req: MedusaRequest): Record<string, unknown> {
  const b = req.body;
  if (b != null && typeof b === "object" && !Buffer.isBuffer(b)) {
    return b as Record<string, unknown>;
  }
  return {};
}

function readFormField(
  body: Record<string, unknown>,
  key: string,
): string {
  const v = body[key];
  if (v === undefined || v === null) {
    return "";
  }
  if (Array.isArray(v)) {
    return String(v[0] ?? "").trim();
  }
  return String(v).trim();
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const body = normalizeBody(req);

  const secureCode = process.env.OCEANPAYMENT_SECURE_CODE?.trim();
  if (!secureCode) {
    logger.error("[OceanPayment backUrl] OCEANPAYMENT_SECURE_CODE is not set");
    res.status(500).type("text/plain").send("misconfigured");
    return;
  }

  const fields = {
    account: readFormField(body, "account"),
    terminal: readFormField(body, "terminal"),
    order_number: readFormField(body, "order_number"),
    order_currency: readFormField(body, "order_currency"),
    order_amount: readFormField(body, "order_amount"),
    order_notes: readFormField(body, "order_notes"),
    card_number: readFormField(body, "card_number"),
    payment_id: readFormField(body, "payment_id"),
    payment_authType: readFormField(body, "payment_authType"),
    payment_status: readFormField(body, "payment_status"),
    payment_details: readFormField(body, "payment_details"),
    payment_risk: readFormField(body, "payment_risk"),
  };

  const signValue = readFormField(body, "signValue");

  const expected = buildHostedCheckoutNoticeUrlSignValue({
    ...fields,
    secureCode,
  });

  if (!signValue || !oceanSignValuesEqual(expected, signValue)) {
    logger.warn(
      `[OceanPayment backUrl] Invalid or missing signValue order_number=${fields.order_number} payment_id=${fields.payment_id}`,
    );
    res.status(400).type("text/plain").send("invalid-sign");
    return;
  }

  const base = process.env.OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE?.trim();
  if (!base) {
    logger.error(
      "[OceanPayment backUrl] OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE is not set",
    );
    res.status(500).type("text/plain").send("misconfigured");
    return;
  }

  let target: URL;
  try {
    target = new URL(base);
  } catch {
    res.status(500).type("text/plain").send("bad-redirect-base");
    return;
  }

  for (const key of REDIRECT_QUERY_ALLOWLIST) {
    if (!(key in body)) {
      continue;
    }
    const raw = body[key];
    const s = Array.isArray(raw)
      ? String(raw[0] ?? "").trim()
      : String(raw ?? "").trim();
    if (s !== "") {
      target.searchParams.set(key, s);
    }
  }

  const location = target.toString();
  logger.info(
    `[OceanPayment backUrl] Verified; redirecting order_number=${fields.order_number} payment_id=${fields.payment_id}`,
  );

  res.status(303);
  res.setHeader("Location", location);
  res.end();
}
