import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  addToCartWorkflow,
  releaseLockStep,
  updateCartsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import type { AdditionalData } from "@medusajs/types";
import type { AddToCartWorkflowInputDTO } from "@medusajs/types/dist/cart/workflows";
import type {
  StoreCart,
  StoreCartResponse,
} from "@medusajs/types/dist/http/cart/store";
import type { CartMetadata } from "@repo/types";

export const customAddToCartWorkflow = createWorkflow(
  "custom-add-to-cart",
  (input: AddToCartWorkflowInputDTO & AdditionalData) => {
    // Acquire the lock before running the nested workflow
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    });

    // Run the existing addToCartWorkflow as a step in the custom workflow
    addToCartWorkflow.runAsStep({
      input: input,
    });

    // Refetch the cart to get the updated line items after the addToCartWorkflow step
    const { data } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "items.*"],
      filters: { id: input.cart_id },
    }).config({ name: "refetch-cart" });

    // Update the cart's metadata
    const metadataToUpdate = transform(data, (data) => {
      const updatedCart = data[0];
      const unchecked = (updatedCart.items || []).reduce(
        (acc, item) => {
          if (item?.variant_id) {
            acc[item.variant_id] = {
              quantity: item.quantity,
            };
          }
          return acc;
        },
        {} as Record<string, { quantity: number }>,
      );
      const metadata: CartMetadata = {
        unchecked: unchecked,
      };
      return metadata;
    });
    updateCartsStep([
      {
        id: input.cart_id,
        metadata: metadataToUpdate as unknown as Record<string, unknown>,
      },
    ]);

    // Refetch the updated cart with the new metadata
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
      filters: {
        id: input.cart_id,
      },
    }).config({ name: "refetch-cart-with-metadata" });

    // Transform to StoreCartResponse format with type assertion
    const storeCartResponse = transform(
      finalCartData,
      (data): StoreCartResponse => ({
        cart: data[0] as unknown as StoreCart,
      }),
    );

    // Release the lock after the nested workflow completes
    releaseLockStep({
      key: input.cart_id,
    });

    return new WorkflowResponse(storeCartResponse);
  },
);
