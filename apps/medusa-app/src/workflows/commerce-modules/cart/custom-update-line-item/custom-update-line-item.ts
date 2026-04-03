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
  updateLineItemInCartWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import type {
  StoreCart,
  StoreCartResponse,
} from "@medusajs/types/dist/http/cart/store";
import type { CartMetadata } from "@repo/types";
import { HttpError } from "@repo/types";

// Custom input type for the update line item workflow
type CustomUpdateLineItemInput = {
  cart_id: string;
  line_item_id: string;
  quantity: number;
};

export const customUpdateLineItemWorkflow = createWorkflow(
  "custom-update-line-item",
  (input: CustomUpdateLineItemInput) => {
    // Acquire the lock before running the nested workflow
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    });

    // Get existing cart with line items to validate the line item exists
    const { data: existingCartData } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "items.*", "metadata"],
      filters: { id: input.cart_id },
    }).config({ name: "get-existing-cart-with-items" });

    // Validate line item exists and prepare update data
    const updateData = transform(
      { existingCartData, input },
      (transformData) => {
        const cart = transformData.existingCartData[0];
        const { line_item_id, quantity } = transformData.input;

        if (!cart) {
          throw new HttpError("CART.NOT_FOUND", "Cart not found");
        }

        // Find the line item to update
        const lineItem = (cart.items || []).find(
          (item) => item?.id === line_item_id,
        );

        if (!lineItem) {
          throw new HttpError(
            "CART.ITEM_NOT_FOUND",
            `Line item with id ${line_item_id} not found in cart`,
          );
        }

        return {
          line_item_id: lineItem.id,
          quantity,
        };
      },
    );

    // Conditionally update or delete the line item based on quantity
    when(updateData, (data) => data.quantity > 0).then(() => {
      // Update quantity when quantity > 0
      return updateLineItemInCartWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
          item_id: updateData.line_item_id,
          update: {
            quantity: updateData.quantity,
          },
        },
      });
    });

    when(updateData, (data) => data.quantity === 0).then(() => {
      // Delete line item when quantity is 0
      return deleteLineItemsWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
          ids: [updateData.line_item_id],
        },
      });
    });

    // Refetch the updated cart with the new line item quantities
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
    }).config({ name: "refetch-updated-cart" });

    // Transform to StoreCartResponse format
    const storeCartResponse = transform(
      finalCartData,
      (data): StoreCartResponse => {
        const cart = data[0] as unknown as Record<string, unknown>;
        if (Array.isArray(cart.items)) {
          (cart.items as { created_at?: string }[]).sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime(),
          );
        }
        if (cart.metadata) {
          const unselected =
            (cart.metadata as unknown as CartMetadata)?.unselected || {};
          (cart.metadata as unknown as CartMetadata).unselected =
            Object.fromEntries(
              Object.entries(unselected).sort(
                ([, a], [, b]) =>
                  new Date(b.created_at || 0).getTime() -
                  new Date(a.created_at || 0).getTime(),
              ),
            ) as CartMetadata["unselected"];
        }
        return {
          cart: cart as unknown as StoreCart,
        };
      },
    );

    // Release the lock after the workflow completes
    releaseLockStep({
      key: input.cart_id,
    });

    return new WorkflowResponse(storeCartResponse);
  },
);
