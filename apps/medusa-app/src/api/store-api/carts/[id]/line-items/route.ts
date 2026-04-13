import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type {
  AddToCartWorkflowInputDTO,
  HttpTypes,
} from "@medusajs/framework/types";
import { refetchCart } from "@/api/store-api/carts/helpers";
import type { StoreAddCartLineItemType } from "@/api/store-api/carts/validators";
import { customAddToCartWorkflow } from "@/workflows/commerce-modules/cart/custom-add-line-items/custom-add-line-items";

export const POST = async (
  req: MedusaRequest<StoreAddCartLineItemType, HttpTypes.SelectParams>,
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

  await customAddToCartWorkflow(req.scope).run({
    input: workflowInput,
  });

  const cart = await refetchCart(cartId, req.scope, req.queryConfig.fields);
  res.status(200).json({ cart });
};
