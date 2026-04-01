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
import type { AdditionalData, IBigNumber } from "@medusajs/types";
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

    // Get existing cart metadata before adding items
    const { data: existingCartData } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "metadata"],
      filters: { id: input.cart_id },
    }).config({ name: "get-existing-cart-metadata" });

    // Check if the cart has unselected items in metadata and if the input contains those items, if yes, remove them from unselected metadata, and add up quantity from input and existing unselected cart items
    const incomingAndUnselectedQty = transform(
      { existingCartData, input },
      (transformData) => {
        const { quantity, variant_id } = transformData.input.items[0];
        const metadata = transformData.existingCartData[0]
          ?.metadata as unknown as CartMetadata;
        if (!metadata?.unselected || !metadata.unselected[variant_id!]) {
          return (quantity as IBigNumber).valueOf();
        }
        const unselectedQty = metadata?.unselected[variant_id!].quantity || 0;
        const total = (quantity as IBigNumber).valueOf() + unselectedQty;
        return total;
      },
    );

    // Run the existing addToCartWorkflow as a step in the custom workflow
    addToCartWorkflow.runAsStep({
      input: {
        cart_id: input.cart_id,
        items: [
          {
            variant_id: input.items[0].variant_id,
            quantity: incomingAndUnselectedQty,
          },
        ],
      },
    });

    // Refetch the cart to get the updated line items after the addToCartWorkflow step
    const { data } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "items.*"],
      filters: { id: input.cart_id },
    }).config({ name: "refetch-cart" });

    // Update the cart's metadata
    const metadataToUpdate = transform(
      { existingCartData, newCartData: data, input },
      (transformData) => {
        const existingCart = transformData.existingCartData[0];
        const updatedCart = transformData.newCartData[0];
        const addToCartInput = transformData.input;

        // Get existing unselected metadata or initialize empty object
        const existingMetadata =
          (existingCart?.metadata as unknown as CartMetadata) || {};
        const existingUnselected = existingMetadata.unselected || {};

        // Create a copy of existing unselected items
        const updatedUnselected = { ...existingUnselected };

        // Remove newly added items from unselected if they exist
        // The input contains the items being added to cart
        if (addToCartInput.items) {
          for (const item of addToCartInput.items) {
            if (item.variant_id && updatedUnselected[item.variant_id]) {
              delete updatedUnselected[item.variant_id];
            }
          }
        }

        const metadata: CartMetadata = {
          unselected: updatedUnselected,
        };
        return metadata;
      },
    );
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
