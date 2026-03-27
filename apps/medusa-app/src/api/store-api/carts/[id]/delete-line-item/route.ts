import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { HttpTypes } from "@medusajs/framework/types";
import { customDeleteLineItemsWorkflow } from "@/workflows/commerce-modules/cart/custom-delete-line-items/custom-delete-line-items";

type DeleteLineItemRequest = {
  item_id?: string; // line_item_id (for checked items) — optional
  variant_id?: string; // variant_id (for unselected items) — optional
};

/**
 * This route is used to delete a line item from the cart.
 * - If item_id is provided: it will delete the checked item from cart.items
 * - If variant_id is provided: it will remove the unselected item from cart.metadata.unselected
 */
export const POST = async (
  req: MedusaRequest<DeleteLineItemRequest, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const cartId = req.params.id;
  const { item_id, variant_id } = req.validatedBody;

  const workflowInput = {
    cart_id: cartId,
    item_id,
    variant_id,
  };

  const { result } = await customDeleteLineItemsWorkflow(req.scope).run({
    input: workflowInput,
  });

  res.send(result as unknown as HttpTypes.StoreCartResponse);
};
