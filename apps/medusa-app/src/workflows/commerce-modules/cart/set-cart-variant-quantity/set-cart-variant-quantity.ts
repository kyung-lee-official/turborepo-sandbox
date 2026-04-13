import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  type ApplySetCartVariantQuantityInput,
  applySetCartVariantQuantityStep,
} from "./steps/apply-set-cart-variant-quantity";

export const setCartVariantQuantityWorkflow = createWorkflow(
  "set-cart-variant-quantity",
  (input: ApplySetCartVariantQuantityInput) => {
    // Do not acquireLockStep here: applySetCartVariantQuantityStep runs nested
    // deleteLineItemsWorkflow / addToCartWorkflow / updateLineItemInCartWorkflow /
    // refreshCartItemsWorkflow via .run(), each of which acquires the same cart
    // lock — a parent lock would cause "Failed to acquire lock".

    applySetCartVariantQuantityStep(input);

    return new WorkflowResponse(
      transform(input, (inp) => ({ cart_id: inp.cart_id })),
    );
  },
);
