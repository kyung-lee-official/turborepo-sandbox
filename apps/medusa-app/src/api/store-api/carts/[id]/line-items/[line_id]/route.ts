import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { HttpTypes } from "@medusajs/framework/types";
import { refetchCart } from "@/api/store-api/carts/helpers";
import type { UpdateLineItemBody } from "@/api/store-api/carts/validators";
import { customUpdateLineItemWorkflow } from "@/workflows/commerce-modules/cart/custom-update-line-item/custom-update-line-item";

export const POST = async (
  req: MedusaRequest<UpdateLineItemBody, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const cartId = req.params.id;
  const lineItemId = req.params.line_id;

  const workflowInput = {
    cart_id: cartId,
    line_item_id: lineItemId,
    quantity: req.validatedBody.quantity,
  };

  await customUpdateLineItemWorkflow(req.scope).run({
    input: workflowInput,
  });

  const cart = await refetchCart(cartId, req.scope, req.queryConfig.fields, {
    skipRefreshAndSync: true,
  });
  res.status(200).json({ cart });
};
