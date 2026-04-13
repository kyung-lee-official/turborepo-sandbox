import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { HttpTypes } from "@medusajs/framework/types";
import type { StoreSetVariantQuantityType } from "@/api/store-api/carts/validators";
import { setCartVariantQuantityWorkflow } from "@/workflows/commerce-modules/cart/set-cart-variant-quantity/set-cart-variant-quantity";

export const POST = async (
  req: MedusaRequest<StoreSetVariantQuantityType, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const cartId = req.params.id;
  const variantId = req.params.variant_id;

  const { result } = await setCartVariantQuantityWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
      variant_id: variantId,
      quantity: req.validatedBody.quantity,
    },
  });

  res.send(result as unknown as HttpTypes.StoreCartResponse);
};
