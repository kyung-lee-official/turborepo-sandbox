import type { MedusaRequest, MedusaResponse, Query } from "@medusajs/framework";
import type { AdminPaymentSession } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { HttpError } from "@repo/types";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { token, PayerID } = req.body as { token?: string; PayerID?: string };

  if (token && PayerID) {
    /* PayPal */
    // find payment session by token
    const query = req.scope.resolve("query") as Query;
    const paymentSessions = (await query.graph({
      entity: "payment_session",
      fields: ["*"],
      filters: {
        data: {
          id: token,
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
    if (!paymentSession.payment) {
      throw new HttpError(
        "PAYMENT.PAYPAL_MISSING_CONTEXT",
        "No payment found for the provided payment session",
      );
    }

    const paymentService = req.scope.resolve(Modules.PAYMENT);
    const payment = await paymentService.retrievePayment(
      paymentSession.payment.id,
    );
    res.status(200).send(payment);
    return;
  }

  /* other payment providers can be handled here */

  throw new HttpError(
    "PAYMENT.PAYPAL_ORDER_ID_NOT_FOUND",
    "Token (PayPal order ID) and PayerID are required in the request body",
  );
}
