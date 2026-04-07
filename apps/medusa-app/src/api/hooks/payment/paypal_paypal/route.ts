import type { MedusaRequest, MedusaResponse, Query } from "@medusajs/framework";
import type {
  AdminPayment,
  AdminPaymentSession,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows";
import {
  HttpError,
  type PayPalAuthorizationEvent,
  type PayPalCaptureCompletedEvent,
  type PayPalCheckoutOrderApprovedEvent,
  type PayPalWebhookEvent,
} from "@repo/types";
import { mergePayPalWebhookRefundIntoProviderData } from "@/modules/paypal-payment/paypal-payment-data";
import { findPayPalPaymentForRefundWebhook } from "@/modules/paypal-payment/paypal-webhook-find-payment";
import { customCompleteCartWorkflow } from "@/workflows/commerce-modules/cart/custom-complete-cart/custom-complete-cart";
import { verifyWebhookSignature } from "./verify-webhook-signature";

function extractCaptureIdFromRefundResource(
  resource: Record<string, unknown>,
): string | undefined {
  const links = resource.links as
    | Array<{ rel?: string; href?: string }>
    | undefined;
  const up = links?.find((l) => l.rel === "up");
  const href = up?.href;
  if (typeof href === "string") {
    const m = href.match(/\/captures\/([^/]+)/);
    return m?.[1];
  }
  return undefined;
}

async function syncPayPalWebhookRefundToMedusaPayment(
  req: MedusaRequest,
  body: { event_type: string; resource: Record<string, unknown> },
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as Query;
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const paymentModule = req.scope.resolve(Modules.PAYMENT) as {
    updatePayment: (input: {
      id: string;
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };

  const resource = body.resource;
  const found = await findPayPalPaymentForRefundWebhook(query, resource);
  if (!found) {
    logger.warn(
      `[PayPal webhook] No Medusa payment matched ${body.event_type}. Check order/capture ids in the payload and PAYPAL_MEDUSA_PAYMENT_PROVIDER_ID.`,
    );
    return;
  }

  const merged = mergePayPalWebhookRefundIntoProviderData(found.data, {
    event_type: body.event_type,
    resource,
  });

  await paymentModule.updatePayment({
    id: found.id,
    data: merged,
  });

  logger.info(
    `[PayPal webhook] Merged ${body.event_type} into payment.data for payment ${found.id}`,
  );
}

/**
 * If PayPal webhook failed to hit this endpoint, PayPal marks the webhook event as FAIL_SOFT,
 * and will retry sending the webhook event for a certain period of time (typically around 1 minute).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as PayPalWebhookEvent;
  try {
    const isValid = await verifyWebhookSignature(
      req.headers as Record<string, string>,
      body,
    );
    if (!isValid) {
      throw new HttpError("PAYMENT.PAYPAL_INVALID_WEBHOOK_SIGNATURE");
    }
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
    logger.info(
      `[PayPal webhook] Received and verified event: ${body.event_type}`,
    );

    switch (body.event_type) {
      case "CHECKOUT.ORDER.APPROVED": {
        const event = body as PayPalCheckoutOrderApprovedEvent;
        const query = req.scope.resolve("query") as Query;
        const paymentSessions = (await query.graph({
          entity: "payment_session",
          fields: ["*"],
          filters: {
            data: {
              id: event.resource.id,
            },
          },
        })) as { data: AdminPaymentSession[] };
        if (paymentSessions.data.length === 0) {
          throw new HttpError(
            "PAYMENT.PAYPAL_ORDER_ID_NOT_FOUND",
            "No payment session found for the provided token",
          );
        }
        const paymentSession = paymentSessions.data[0];

        const { id, context, data } = paymentSession;
        if (!context) {
          throw new HttpError(
            "PAYMENT.PAYPAL_MISSING_CONTEXT",
            "No context found for the payment session",
          );
        }
        const paymentModuleService = req.scope.resolve(Modules.PAYMENT);
        await paymentModuleService.authorizePaymentSession(id, {
          ...context,
          data,
        });
        logger.info(
          `[PayPal webhook] CHECKOUT.ORDER.APPROVED — authorized payment_session=${id} paypal_order_id=${event.resource.id}`,
        );
        break;
      }
      case "PAYMENT.AUTHORIZATION.CREATED": {
        /* This event is triggered after the customer approves the payment created with the AUTHORIZE intent. Upon approval, the payment provider invokes PayPal's authorize API to authorize the transaction. At this stage, you may proceed to capture the payment as required */
        const event = body as PayPalAuthorizationEvent;
        const paypalOrderId =
          event.resource.supplementary_data.related_ids.order_id;
        const query = req.scope.resolve("query") as Query;
        const payments = (await query.graph({
          entity: "payment",
          fields: ["id"],
          filters: {
            id: paypalOrderId,
          },
        })) as { data: AdminPayment[] };
        if (payments.data.length === 0) {
          throw new HttpError(
            "PAYMENT.PAYMENT_NOT_FOUND",
            "No payment found for the provided PayPal order ID",
          );
        }
        const payment = payments.data[0];

        const { result } = await capturePaymentWorkflow(req.scope).run({
          input: {
            payment_id: payment.id,
          },
        });
        logger.info(
          `[PayPal webhook] PAYMENT.AUTHORIZATION.CREATED — ran capture workflow payment_id=${payment.id} paypal_order_id=${paypalOrderId}`,
        );
        res.status(200).send(result);
        break;
      }
      case "PAYMENT.CAPTURE.COMPLETED": {
        /* Complete the cart */
        const event = body as PayPalCaptureCompletedEvent;
        const cartId = event.resource.custom_id;
        if (!cartId) {
          throw new HttpError(
            "PAYMENT.PAYPAL_MISSING_CONTEXT",
            "No cart ID found in the PayPal capture completed event",
          );
        }
        const { result } = await customCompleteCartWorkflow(req.scope).run({
          input: {
            id: cartId,
          },
        });
        logger.info(
          `[PayPal webhook] PAYMENT.CAPTURE.COMPLETED — completed cart cart_id=${cartId}`,
        );
        res.status(200).send(result);
        break;
      }
      case "PAYMENT.CAPTURE.REFUNDED": {
        const resource = body.resource as Record<string, unknown>;
        const refundId = resource.id;
        const captureId = extractCaptureIdFromRefundResource(resource);
        logger.info(
          `[PayPal webhook] PAYMENT.CAPTURE.REFUNDED (Payments v2 refund API succeeded) refund_id=${String(refundId)} capture_id=${captureId ?? "unknown"}`,
        );
        break;
      }
      case "CUSTOMER.DISPUTE.RESOLVED":
      case "PAYMENT.CAPTURE.REVERSED": {
        await syncPayPalWebhookRefundToMedusaPayment(req, {
          event_type: body.event_type,
          resource: body.resource as Record<string, unknown>,
        });
        break;
      }
      default:
        /* ignore unknown event types */
        logger.warn(
          `[PayPal webhook] Ignoring unknown event type: ${body.event_type}`,
        );
        break;
    }
    res.status(200).end();
    return;
  } catch (error) {
    throw new HttpError(
      "PAYMENT.PAYPAL_INVALID_WEBHOOK_SIGNATURE",
      "Caution, invalid PayPal webhook signature",
    );
  }
}
