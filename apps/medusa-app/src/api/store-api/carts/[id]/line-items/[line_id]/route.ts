import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { HttpTypes } from "@medusajs/framework/types";
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

  const { result } = await customUpdateLineItemWorkflow(req.scope).run({
    input: workflowInput,
  });

  res.send(result as unknown as HttpTypes.StoreCartResponse);
};
