import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { HttpTypes } from "@medusajs/framework/types";
import { customAddToCartWorkflow } from "@/workflows/commerce-modules/cart/custom-add-line-items/custom-add-line-items";

type StoreSelectCartLineItemPayload = {
  variant_id: string;
  quantity?: number;
};

/**
 * Select a previously unselected item back into cart line items.
 * Omit `quantity` to restore the full unselected amount; pass a positive integer to move only that many units.
 */
export const POST = async (
  req: MedusaRequest<StoreSelectCartLineItemPayload, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const cartId = req.params.id;

  const workflowInput = {
    cart_id: cartId,
    from_unselected_only: true as const,
    items: [
      {
        variant_id: req.validatedBody.variant_id,
        quantity: req.validatedBody.quantity ?? 0,
      },
    ],
  };

  const { result } = await customAddToCartWorkflow(req.scope).run({
    input: workflowInput,
  });

  res.send(result as unknown as HttpTypes.StoreCartResponse);
};
