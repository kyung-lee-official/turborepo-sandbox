import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { useQueryGraphStep } from "@medusajs/medusa/core-flows";
import type {
  StoreCart,
  StoreCartResponse,
} from "@medusajs/types/dist/http/cart/store";
import { applyStoreCartDisplayOrder } from "@/api/store-api/carts/apply-store-cart-display-order";
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

    const { data: finalCartData } = useQueryGraphStep({
      entity: "cart",
      fields: [
        "*",
        "items.*",
        "items.variant.*",
        "items.product.*",
        "shipping_address.*",
        "billing_address.*",
        "region.*",
      ],
      filters: { id: input.cart_id },
    }).config({ name: "refetch-cart-after-variant-quantity" });

    const storeCartResponse = transform(
      finalCartData,
      (data): StoreCartResponse => {
        const cart = data[0] as unknown as Record<string, unknown>;
        applyStoreCartDisplayOrder(cart);
        return {
          cart: cart as unknown as StoreCart,
        };
      },
    );

    return new WorkflowResponse(storeCartResponse);
  },
);
