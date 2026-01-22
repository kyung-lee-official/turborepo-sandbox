import type { MedusaRequest, MedusaResponse, Query } from "@medusajs/framework";
import type {
  AdminPayment,
  AdminPaymentSession,
} from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows";
import {
  HttpError,
  type PayPalAuthorizationEvent,
  type PayPalCaptureCompletedEvent,
  type PayPalCheckoutOrderApprovedEvent,
  type PayPalWebhookEvent,
} from "@repo/types";
import { verifyWebhookSignature } from "./verify-webhook-signature";

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
    console.log(`Webhook received and verified: ${body.event_type}`);

    switch (body.event_type) {
      case "CHECKOUT.ORDER.APPROVED": {
        const event = body as PayPalCheckoutOrderApprovedEvent;
        switch (event.resource.intent) {
          /* customer has approved the PayPal checkout order, now authorize/capture the payment from backend */
          case "AUTHORIZE": {
            const query = req.scope.resolve("query") as Query;
            const paymentSessions = (await query.graph({
              entity: "payment_session",
              fields: ["*"],
              filters: {
                data: {
                  id: body.resource.id,
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
            const payment = await paymentModuleService.authorizePaymentSession(
              id,
              { ...context, data },
            );
            break;
          }
          case "CAPTURE":
            break;
          default:
            break;
        }
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
            data: {
              id: paypalOrderId,
            },
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
        res.send(result);
        break;
      }
      case "PAYMENT.CAPTURE.COMPLETED": {
        const event = body as PayPalCaptureCompletedEvent;
        break;
      }
      default:
        /* ignore unknown event types */
        console.warn(
          `Ignoring unknown PayPal webhook event type: ${body.event_type}`,
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
