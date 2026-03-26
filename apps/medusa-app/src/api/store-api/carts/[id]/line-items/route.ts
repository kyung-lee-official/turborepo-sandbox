import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type {
  AddToCartWorkflowInputDTO,
  HttpTypes,
} from "@medusajs/framework/types";
import { customAddToCartWorkflow } from "@/workflows/commerce-modules/cart/custom-add-to-cart/custom-add-to-cart";

export const POST = async (
  req: MedusaRequest<HttpTypes.StoreAddCartLineItem, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const cartId = req.params.id;

  const workflowInput: AddToCartWorkflowInputDTO = {
    cart_id: cartId,
    items: [
      {
        variant_id: req.validatedBody.variant_id,
        quantity: req.validatedBody.quantity,
      },
    ],
  };

  const { result } = await customAddToCartWorkflow(req.scope).run({
    input: workflowInput,
  });

  res.send(result as unknown as HttpTypes.StoreCartResponse);
};
