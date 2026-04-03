import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { createPaymentSessionsForCartWorkflow } from "@/workflows/commerce-modules/payment/create-payment-sessions-for-cart";
import type { StoreCreatePaymentSessionsType } from "./validators";

export async function POST(
  req: MedusaRequest<StoreCreatePaymentSessionsType>,
  res: MedusaResponse,
) {
  const { cart_id, provider_id, data } = req.validatedBody;

  const { result } = await createPaymentSessionsForCartWorkflow(req.scope).run({
    input: {
      cart_id,
      provider_id,
      data,
    },
  });

  res.status(200).json(result);
}
