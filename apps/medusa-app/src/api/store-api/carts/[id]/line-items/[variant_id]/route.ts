import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { HttpTypes } from "@medusajs/framework/types";
import { customRemoveCartItemWorkflow } from "@/workflows/commerce-modules/cart/custom-remove-cart-item/custom-remove-cart-item";

/**
 * This route is used to delete a line item from the cart by variant_id.
 * - If the variant exists in cart.items (checked): it will be deleted from the cart
 * - If the variant exists in metadata.unchecked (unchecked): it will be removed from the unchecked metadata
 */
export const DELETE = async (
  req: MedusaRequest<never, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const cartId = req.params.id;
  const variantId = req.params.variant_id;

  const workflowInput = {
    cart_id: cartId,
    variant_id: variantId,
  };

  const { result } = await customRemoveCartItemWorkflow(req.scope).run({
    input: workflowInput,
  });

  res.send(result as unknown as HttpTypes.StoreCartResponse);
};
