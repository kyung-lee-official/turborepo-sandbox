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
import { applyStoreCartDisplayOrder } from "@/api/store-api/carts/apply-store-cart-display-order";
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

      // Persistent write-once map that tracks the true first-add timestamp for each variant.
      // Using this instead of item.created_at means the timestamp survives re-select cycles.
      const existingOriginalCreatedAt =
        existingMetadata.item_original_created_at ?? {};
      const updatedOriginalCreatedAt = { ...existingOriginalCreatedAt };

      const lineItemsToUnselect = (updatedCart.items || []).filter(
        (item) => !!item?.id && transformData.input.ids.includes(item.id),
      );

      const newlyUnselected = lineItemsToUnselect.reduce(
        (acc, item) => {
          if (item?.variant_id) {
            // Use the persisted original created_at if available (survives re-select cycles),
            // otherwise fall back to the line item's own created_at (correct for first unselect).
            const originalCreatedAt =
              existingOriginalCreatedAt[item.variant_id] ??
              (item.created_at
                ? new Date(item.created_at).toISOString()
                : new Date().toISOString());

            acc[item.variant_id] = {
              quantity: item.quantity,
              created_at: originalCreatedAt,
              title: item.title,
              subtitle: item.subtitle ?? null,
              variant_title: item.variant_title ?? null,
              variant_sku: item.variant_sku ?? null,
              unit_price: Number(item.unit_price),
              thumbnail: item.thumbnail ?? null,
            };

            // Write-once: record if not already stored
            if (!updatedOriginalCreatedAt[item.variant_id]) {
              updatedOriginalCreatedAt[item.variant_id] = originalCreatedAt;
            }
          }
          return acc;
        },
        {} as Record<
          string,
          {
            quantity: number;
            created_at: string;
            title: string;
            subtitle: string | null;
            variant_title: string | null;
            variant_sku: string | null;
            unit_price: number;
            thumbnail: string | null;
          }
        >,
      );

      const metadata: CartMetadata = {
        unselected: {
          ...existingUnselected,
          ...newlyUnselected,
        },
        item_original_created_at: updatedOriginalCreatedAt,
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
      (data): StoreCartResponse => {
        const cart = data[0] as unknown as Record<string, unknown>;
        applyStoreCartDisplayOrder(cart);
        return {
          cart: cart as unknown as StoreCart,
        };
      },
    );

    // Release the lock after the nested workflow completes
    releaseLockStep({
      key: input.cart_id,
    });

    return new WorkflowResponse(storeCartResponse);
  },
);
