import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { HttpTypes } from "@medusajs/framework/types";
import { customUnselectCartItemWorkflow } from "@/workflows/commerce-modules/cart/custom-unselect-cart-item/custom-unselect-cart-item";

/**
 * This route is used to uncheck a line item in the cart,
 * which means it will be removed from the cart when the cart is updated.
 * The quantity of the line item will be stored in the metadata of the cart,
 * so that it can be restored if the user checks the line item again.
 */
export const DELETE = async (
  req: MedusaRequest<HttpTypes.StoreAddCartLineItem, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const cartId = req.params.id;
  const lineId = req.params.line_id;

  const workflowInput = {
    cart_id: cartId,
    ids: [lineId],
  };

  const { result } = await customUnselectCartItemWorkflow(req.scope).run({
    input: workflowInput,
  });

  res.send(result as unknown as HttpTypes.StoreCartResponse);
};
