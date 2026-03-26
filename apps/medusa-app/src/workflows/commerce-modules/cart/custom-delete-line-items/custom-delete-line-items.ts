import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  deleteLineItemsWorkflow,
  releaseLockStep,
  updateCartsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import type { StoreCart, StoreCartResponse } from "@medusajs/types";
import type { CartMetadata } from "@repo/types";

// Custom input type for the new API design
type CustomRemoveCartItemInput = {
  cart_id: string;
  item_id?: string; // line_item_id (for checked items) — optional
  variant_id?: string; // variant_id (for unchecked items) — optional
};

export const customDeleteLineItemsWorkflow = createWorkflow(
  "custom-delete-line-items",
  (input: CustomRemoveCartItemInput) => {
    // Acquire the lock before running the nested workflow
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    });

    // Get current cart with items and metadata
    const { data: cartData } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "items.*", "metadata"],
      filters: { id: input.cart_id },
    }).config({ name: "get-cart-and-metadata" });

    // Find the item by item_id in cart.items or by variant_id in metadata.unchecked
    const itemInfo = transform({ cartData, input }, (transformData) => {
      const cart = transformData.cartData[0];
      const { item_id, variant_id } = transformData.input;

      if (!cart) {
        throw new Error("Cart not found");
      }

      // Validate that exactly one of item_id or variant_id is provided
      if (!item_id && !variant_id) {
        throw new Error("Either item_id or variant_id must be provided");
      }

      if (item_id && variant_id) {
        throw new Error(
          "Only one of item_id or variant_id should be provided, not both",
        );
      }

      const existingMetadata = (cart.metadata as unknown as CartMetadata) || {};
      const uncheckedItems = existingMetadata.unchecked || {};

      // Handle checked item removal (by item_id)
      if (item_id) {
        const lineItem = (cart.items || []).find(
          (item) => item?.id === item_id,
        );

        if (!lineItem) {
          throw new Error(`Line item with id ${item_id} not found in cart`);
        }

        return {
          location: "items" as const,
          lineItemId: lineItem.id,
          existingMetadata,
        };
      }

      // Handle unchecked item removal (by variant_id)
      if (variant_id) {
        if (!uncheckedItems[variant_id]) {
          throw new Error(
            `Item with variant_id ${variant_id} not found in cart metadata`,
          );
        }

        return {
          location: "metadata" as const,
          lineItemId: null,
          existingMetadata,
        };
      }

      // This should never be reached due to validation above
      throw new Error("Invalid input state");
    });

    // Conditionally execute deleteLineItemsWorkflow for checked items
    when(
      "delete-line-items-for-selected-item",
      itemInfo,
      (info) => info.location === "items",
    ).then(() => {
      // assert itemInfo.lineItemId is not null since location is "items"
      if (!itemInfo.lineItemId) {
        throw new Error("lineItemId is required for items location");
      }
      return deleteLineItemsWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
          ids: [itemInfo.lineItemId],
        },
      });
    });

    // Conditionally update metadata for unchecked items
    const updatedMetadata = when(
      "prepare-metadata-for-unselected-item",
      itemInfo,
      (info) => info.location === "metadata",
    ).then(() => {
      return transform({ itemInfo, input }, ({ itemInfo, input }) => {
        const updatedUnchecked = { ...itemInfo.existingMetadata.unchecked };

        // Remove the variant_id from unchecked metadata
        delete updatedUnchecked[input.variant_id!];

        const metadata: CartMetadata = {
          unchecked: updatedUnchecked,
        };

        return metadata;
      });
    });
    // Execute updateCartsStep with the prepared metadata
    when(
      "update-metadata-for-unselected-item",
      itemInfo,
      (info) => info.location === "metadata",
    ).then(() => {
      return updateCartsStep([
        {
          id: input.cart_id,
          metadata: updatedMetadata as unknown as Record<string, unknown>,
        },
      ]);
    });

    // Refetch the updated cart
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

    // Transform to StoreCartResponse format
    const storeCartResponse = transform(
      finalCartData,
      (data): StoreCartResponse => ({
        cart: data[0] as unknown as StoreCart,
      }),
    );

    // Release the lock after the workflow completes
    releaseLockStep({
      key: input.cart_id,
    });

    return new WorkflowResponse(storeCartResponse);
  },
);
