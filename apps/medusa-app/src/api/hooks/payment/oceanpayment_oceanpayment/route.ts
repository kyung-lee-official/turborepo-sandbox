import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { mergeOceanNoticeIntoPaymentData } from "@/modules/ocean-payment/ocean-payment-data";
import { findOceanPaymentByOrderNumber } from "@/modules/ocean-payment/ocean-webhook-find-payment";
import { parseOceanCheckoutWebhookXml } from "@/modules/ocean-payment/ocean-webhook-parse";
import { readMedusaRequestBodyUtf8 } from "@/modules/ocean-payment/read-raw-request-body";
import {
  buildCheckoutWebhookTransactionSignValue,
  oceanSignValuesEqual,
} from "@/modules/ocean-payment/sign";

const RECEIVE_OK = "receive-ok";

function getWebhookXmlPayload(req: MedusaRequest): string {
  const raw = req.rawBody;
  if (raw && Buffer.isBuffer(raw) && raw.length > 0) {
    return raw.toString("utf8");
  }
  if (typeof req.body === "string" && req.body.trim().length > 0) {
    return req.body;
  }
  return "";
}

/**
 * OceanPayment async transaction notification (`noticeUrl`).
 * Expects raw XML POST body per
 * https://dev.oceanpayment.com/en/docs/webhook/payments/checkout
 *
 * Configure `OCEANPAYMENT_NOTICE_URL` to this route’s public URL, e.g.
 * `{MEDUSA_BACKEND_URL}/hooks/payment/oceanpayment_oceanpayment`
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  let xml = getWebhookXmlPayload(req);
  if (!xml.trim()) {
    try {
      xml = await readMedusaRequestBodyUtf8(req);
    } catch (e) {
      logger.warn(
        `[OceanPayment webhook] Failed to read request body: ${String(e)}`,
      );
    }
  }

  if (!xml.trim() || !xml.includes("<")) {
    res.status(400).type("text/plain").send("empty-body");
    return;
  }

  const secureCode = process.env.OCEANPAYMENT_SECURE_CODE?.trim();
  if (!secureCode) {
    logger.error("[OceanPayment webhook] OCEANPAYMENT_SECURE_CODE is not set");
    res.status(500).type("text/plain").send("misconfigured");
    return;
  }

  const fields = parseOceanCheckoutWebhookXml(xml);
  const expected = buildCheckoutWebhookTransactionSignValue({
    account: fields.account,
    terminal: fields.terminal,
    order_number: fields.order_number,
    order_currency: fields.order_currency,
    order_amount: fields.order_amount,
    order_notes: fields.order_notes,
    card_number: fields.card_number,
    payment_id: fields.payment_id,
    payment_authType: fields.payment_authType,
    payment_status: fields.payment_status,
    payment_details: fields.payment_details,
    payment_risk: fields.payment_risk,
    secureCode,
  });

  if (!oceanSignValuesEqual(expected, fields.signValue)) {
    logger.warn(
      `[OceanPayment webhook] Invalid signature for order_number=${fields.order_number} payment_id=${fields.payment_id}`,
    );
    res.status(400).type("text/plain").send("invalid-sign");
    return;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const paymentModule = req.scope.resolve(Modules.PAYMENT) as {
    updatePayment: (input: {
      id: string;
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };

  const found = await findOceanPaymentByOrderNumber(
    query,
    fields.order_number,
  );

  if (!found) {
    logger.warn(
      `[OceanPayment webhook] No Medusa payment for order_number=${fields.order_number} (signature OK; check provider_id and session data.order_number).`,
    );
    res.status(200).type("text/plain").send(RECEIVE_OK);
    return;
  }

  const merged = mergeOceanNoticeIntoPaymentData(found.data, {
    ...fields,
    raw_xml_length: xml.length,
  });

  await paymentModule.updatePayment({
    id: found.id,
    data: merged,
  });

  logger.info(
    `[OceanPayment webhook] Stored notice for payment_id=${found.id} ocean_payment_id=${fields.payment_id} status=${fields.payment_status}`,
  );

  res.status(200).type("text/plain").send(RECEIVE_OK);
}
