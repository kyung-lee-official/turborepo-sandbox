import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type {
  AddToCartWorkflowInputDTO,
  HttpTypes,
} from "@medusajs/framework/types";
import { customAddToCartWorkflow } from "@/workflows/commerce-modules/cart/custom-add-line-items/custom-add-line-items";

type StoreSelectCartLineItemPayload = {
  variant_id: string;
  metadata?: Record<string, unknown> | null;
};

/**
 * Select a previously unselected item back into cart line items.
 * This mirrors the add-line-items route behavior but is expressed as a dedicated API.
 */
export const POST = async (
  req: MedusaRequest<StoreSelectCartLineItemPayload, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const cartId = req.params.id;

  const workflowInput: AddToCartWorkflowInputDTO = {
    cart_id: cartId,
    items: [
      {
        variant_id: req.validatedBody.variant_id,
        quantity: 0,
      },
    ],
  };

  const { result } = await customAddToCartWorkflow(req.scope).run({
    input: workflowInput,
  });

  res.send(result as unknown as HttpTypes.StoreCartResponse);
};
