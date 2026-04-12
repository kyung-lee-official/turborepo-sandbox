import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { HttpTypes } from "@medusajs/framework/types";
import type { DeleteLineItemBody } from "@/api/store-api/carts/validators";
import { customDeleteLineItemsWorkflow } from "@/workflows/commerce-modules/cart/custom-delete-line-items/custom-delete-line-items";

export const POST = async (
  req: MedusaRequest<DeleteLineItemBody, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const cartId = req.params.id;
  const { item_id } = req.validatedBody;

  const { result } = await customDeleteLineItemsWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
      item_id,
    },
  });

  res.send(result as unknown as HttpTypes.StoreCartResponse);
};
