import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import type { DeleteLineItemsWorkflowInput } from "@medusajs/medusa/core-flows";
import {
  acquireLockStep,
  deleteLineItemsWorkflow,
  releaseLockStep,
  updateCartsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import type { StoreCart, StoreCartResponse } from "@medusajs/types";
import type { CartMetadata } from "@repo/types";

export const customUnselectCartItemWorkflow = createWorkflow(
  "custom-unselect-cart-item",
  (input: DeleteLineItemsWorkflowInput) => {
    // Acquire the lock before running the nested workflow
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    });

    // get the cart to item variant ids and quantities before the line items are deleted
    const { data } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "items.*"],
      filters: { id: input.cart_id },
    }).config({ name: "get-variants" });

    // Update cart metadata by appending only the line item(s) being unselected.
    const metadataToUpdate = transform({ data, input }, (transformData) => {
      const updatedCart = transformData.data[0];
      const existingMetadata =
        (updatedCart?.metadata as unknown as CartMetadata) || {};
      const existingUnselected = existingMetadata.unselected || {};

      const lineItemsToUnselect = (updatedCart.items || []).filter(
        (item) => !!item?.id && transformData.input.ids.includes(item.id),
      );

      const newlyUnselected = lineItemsToUnselect.reduce(
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
        unselected: {
          ...existingUnselected,
          ...newlyUnselected,
        },
      };
      return metadata;
    });
    updateCartsStep([
      {
        id: input.cart_id,
        metadata: metadataToUpdate as unknown as Record<string, unknown>,
      },
    ]);

    // Delete the line items using the existing deleteLineItemsWorkflow as a step
    const result = deleteLineItemsWorkflow.runAsStep({
      input: {
        cart_id: input.cart_id,
        ids: input.ids,
      },
    });

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
