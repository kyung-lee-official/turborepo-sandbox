import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { mergeOceanNoticeIntoPaymentData } from "@/modules/ocean-payment/ocean-payment-data";
import {
  findOceanPaymentByOrderNumber,
  findOceanPaymentSessionByOrderNumber,
} from "@/modules/ocean-payment/ocean-webhook-find-payment";
import {
  mergeOceanSessionDataForAuthorizeFromNotice,
  parseHostedCheckoutNoticeXml,
} from "@/modules/ocean-payment/ocean-webhook-parse";
import { readMedusaRequestBodyUtf8 } from "@/modules/ocean-payment/read-raw-request-body";
import {
  buildHostedCheckoutNoticeUrlSignValue,
  oceanSignValuesEqual,
} from "@/modules/ocean-payment/sign";
import { customCompleteCartWorkflow } from "@/workflows/commerce-modules/cart/custom-complete-cart/custom-complete-cart";

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

function isPaymentSessionAuthorizedLike(status: string | undefined): boolean {
  const s = String(status ?? "").toLowerCase();
  return s === "authorized" || s === "captured" || s === "requires_capture";
}

/**
 * Hosted Checkout only — async `noticeUrl` notification after `sendTrade` / `pay_url`.
 * Raw XML POST body per
 * https://dev.oceanpayment.com/en/docs/webhook/payments/checkout
 *
 * On successful payment (`payment_status === "1"`), mirrors the PayPal webhook flow:
 * `authorizePaymentSession` then {@link customCompleteCartWorkflow} (same as store checkout).
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

  const fields = parseHostedCheckoutNoticeXml(xml);
  const expected = buildHostedCheckoutNoticeUrlSignValue({
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
    authorizePaymentSession: (
      id: string,
      input: Record<string, unknown>,
    ) => Promise<unknown>;
    retrievePaymentSession: (
      id: string,
      config?: { relations?: string[] },
    ) => Promise<{ status?: string }>;
    updatePayment: (input: {
      id: string;
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };

  const noticeAudit = {
    ...fields,
    raw_xml_length: xml.length,
  };

  const persistNoticeOnPayment = async (): Promise<void> => {
    const payment = await findOceanPaymentByOrderNumber(
      query,
      fields.order_number,
    );
    if (!payment) {
      return;
    }
    const merged = mergeOceanNoticeIntoPaymentData(payment.data, noticeAudit);
    await paymentModule.updatePayment({
      id: payment.id,
      data: merged,
    });
  };

  const session = await findOceanPaymentSessionByOrderNumber(
    query,
    fields.order_number,
  );

  if (!session) {
    logger.warn(
      `[OceanPayment webhook] No Medusa payment_session for order_number=${fields.order_number} (signature OK; check provider_id and session data.order_number).`,
    );
    await persistNoticeOnPayment();
    res.status(200).type("text/plain").send(RECEIVE_OK);
    return;
  }

  const context = session.context ?? {};
  const sessionData = (session.data ?? {}) as Record<string, unknown>;
  const cartId =
    (typeof context.custom_id === "string" && context.custom_id.trim()) ||
    (typeof sessionData.medusa_cart_id === "string" &&
      sessionData.medusa_cart_id.trim()) ||
    "";

  if (!session.context || Object.keys(context).length === 0) {
    logger.error(
      `[OceanPayment webhook] Missing context on payment_session=${session.id}`,
    );
    await persistNoticeOnPayment();
    res.status(200).type("text/plain").send(RECEIVE_OK);
    return;
  }

  if (!cartId) {
    logger.error(
      `[OceanPayment webhook] No cart id (context.custom_id / data.medusa_cart_id) on payment_session=${session.id}`,
    );
    await persistNoticeOnPayment();
    res.status(200).type("text/plain").send(RECEIVE_OK);
    return;
  }

  const { data: cartsForIdempotency } = (await query.graph({
    entity: "cart",
    fields: ["id", "completed_at"],
    filters: { id: cartId },
  })) as { data: Array<{ id: string; completed_at: string | null }> };

  if (cartsForIdempotency[0]?.completed_at) {
    logger.info(
      `[OceanPayment webhook] Cart already completed cart_id=${cartId}; persisting notice only.`,
    );
    await persistNoticeOnPayment();
    res.status(200).type("text/plain").send(RECEIVE_OK);
    return;
  }

  if (fields.payment_status === "1") {
    const dataForAuthorize = mergeOceanSessionDataForAuthorizeFromNotice(
      sessionData,
      fields,
    );

    try {
      await paymentModule.authorizePaymentSession(session.id, {
        ...context,
        data: dataForAuthorize,
      });
      logger.info(
        `[OceanPayment webhook] Authorized payment_session=${session.id} order_number=${fields.order_number} ocean_payment_id=${fields.payment_id}`,
      );
    } catch (authErr: unknown) {
      let statusAfter: string | undefined;
      try {
        const refreshed = await paymentModule.retrievePaymentSession(
          session.id,
        );
        statusAfter = refreshed.status;
      } catch {
        /* ignore */
      }
      if (!isPaymentSessionAuthorizedLike(statusAfter)) {
        logger.error(
          `[OceanPayment webhook] authorizePaymentSession failed session=${session.id}: ${String(authErr)}`,
        );
        await persistNoticeOnPayment();
        res.status(500).type("text/plain").send("authorize-failed");
        return;
      }
      logger.warn(
        `[OceanPayment webhook] authorizePaymentSession skipped (session already in success state) session=${session.id} status=${statusAfter}`,
      );
    }

    try {
      await customCompleteCartWorkflow(req.scope).run({
        input: { id: cartId },
      });
      logger.info(
        `[OceanPayment webhook] Completed cart cart_id=${cartId} order_number=${fields.order_number}`,
      );
    } catch (completeErr: unknown) {
      const { data: cartsRetry } = (await query.graph({
        entity: "cart",
        fields: ["id", "completed_at"],
        filters: { id: cartId },
      })) as { data: Array<{ id: string; completed_at: string | null }> };
      if (cartsRetry[0]?.completed_at) {
        logger.info(
          `[OceanPayment webhook] Cart completed concurrently cart_id=${cartId}`,
        );
      } else {
        logger.error(
          `[OceanPayment webhook] customCompleteCartWorkflow failed cart_id=${cartId}: ${String(completeErr)}`,
        );
        await persistNoticeOnPayment();
        res.status(500).type("text/plain").send("complete-cart-failed");
        return;
      }
    }
  }

  await persistNoticeOnPayment();

  logger.info(
    `[OceanPayment webhook] Stored notice for order_number=${fields.order_number} ocean_payment_id=${fields.payment_id} status=${fields.payment_status}`,
  );

  res.status(200).type("text/plain").send(RECEIVE_OK);
}
