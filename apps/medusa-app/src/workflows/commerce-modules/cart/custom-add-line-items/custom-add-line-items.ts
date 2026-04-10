import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  addToCartWorkflow,
  refreshCartItemsWorkflow,
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
import { type CartMetadata, HttpError } from "@repo/types";
import { applyStoreCartDisplayOrder } from "@/api/store-api/carts/apply-store-cart-display-order";
import { syncUnselectedMetadataFromCatalogStep } from "@/api/store-api/carts/sync-unselected-metadata-from-catalog-step";

type CustomAddToCartWorkflowInput = AddToCartWorkflowInputDTO &
  AdditionalData & {
    /** Set only by `POST .../line-items/select`; do not merge with normal add-line-item semantics. */
    from_unselected_only?: boolean;
  };

function resolveAddToCartQuantity(params: {
  from_unselected_only: boolean | undefined;
  cart: { metadata?: unknown };
  variantId: string;
  inputQuantity: number;
}): number {
  const { from_unselected_only, cart, variantId, inputQuantity } = params;
  const metadata = cart.metadata as unknown as CartMetadata;

  if (!from_unselected_only) {
    if (!metadata?.unselected || !metadata.unselected[variantId]) {
      return inputQuantity;
    }
    const unselectedQty = metadata.unselected[variantId].quantity || 0;
    return inputQuantity + unselectedQty;
  }

  const entry = metadata?.unselected?.[variantId];
  if (!entry) {
    throw new HttpError(
      "CART.VARIANT_NOT_UNSELECTED",
      "Variant is not present in cart unselected metadata",
    );
  }
  const unselectedQty = entry.quantity || 0;
  if (unselectedQty <= 0) {
    throw new HttpError(
      "CART.VARIANT_NOT_UNSELECTED",
      "No unselected quantity for this variant",
    );
  }
  if (inputQuantity === 0) {
    return unselectedQty;
  }
  if (inputQuantity > unselectedQty) {
    throw new HttpError(
      "CART.UNSELECTED_QUANTITY_EXCEEDED",
      "Requested quantity exceeds unselected quantity for this variant",
    );
  }
  return inputQuantity;
}

export const customAddToCartWorkflow = createWorkflow(
  "custom-add-to-cart",
  (input: CustomAddToCartWorkflowInput) => {
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

    const incomingAndUnselectedQty = transform(
      { existingCartData, input },
      (transformData) => {
        const cart = transformData.existingCartData[0];
        if (!cart) {
          throw new HttpError("CART.NOT_FOUND", "Cart not found");
        }

        const { quantity, variant_id } = transformData.input.items[0];
        const inputQty = (quantity as IBigNumber).valueOf();

        return resolveAddToCartQuantity({
          from_unselected_only: transformData.input.from_unselected_only,
          cart,
          variantId: variant_id!,
          inputQuantity: inputQty,
        });
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

        if (addToCartInput.from_unselected_only && addToCartInput.items?.[0]) {
          const item = addToCartInput.items[0];
          const vid = item.variant_id;
          if (vid && updatedUnselected[vid]) {
            const inputQty = (item.quantity as IBigNumber).valueOf();
            const amountMoved = resolveAddToCartQuantity({
              from_unselected_only: true,
              cart: existingCart,
              variantId: vid,
              inputQuantity: inputQty,
            });
            const row = updatedUnselected[vid];
            const nextQty = (row.quantity || 0) - amountMoved;
            if (nextQty <= 0) {
              delete updatedUnselected[vid];
            } else {
              updatedUnselected[vid] = { ...row, quantity: nextQty };
            }
          }
        } else if (addToCartInput.items) {
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

    refreshCartItemsWorkflow.runAsStep({
      input: {
        cart_id: input.cart_id,
        force_refresh: true,
      },
    });

    syncUnselectedMetadataFromCatalogStep({ cart_id: input.cart_id });

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
