import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { HttpTypes } from "@medusajs/framework/types";
import { refetchCart } from "@/api/store-api/carts/helpers";
import type { DeleteLineItemBody } from "@/api/store-api/carts/validators";
import { customDeleteLineItemsWorkflow } from "@/workflows/commerce-modules/cart/custom-delete-line-items/custom-delete-line-items";

export const POST = async (
  req: MedusaRequest<DeleteLineItemBody, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const cartId = req.params.id;
  const { item_id } = req.validatedBody;

  await customDeleteLineItemsWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
      item_id,
    },
  });

  const cart = await refetchCart(cartId, req.scope, req.queryConfig.fields, {
    skipRefreshAndSync: true,
  });
  res.status(200).json({ cart });
};
