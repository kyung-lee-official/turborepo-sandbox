import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  deleteLineItemsWorkflow,
  refreshCartItemsWorkflow,
  releaseLockStep,
  updateCartsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import type { CartMetadata } from "@repo/types";
import { syncUnselectedMetadataFromCatalogStep } from "@/api/store-api/carts/sync-unselected-metadata-from-catalog-step";

type CustomRemoveCartItemInput = {
  cart_id: string;
  item_id: string;
};

export const customDeleteLineItemsWorkflow = createWorkflow(
  "custom-delete-line-items",
  (input: CustomRemoveCartItemInput) => {
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    });

    const { data: cartData } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "items.*", "metadata"],
      filters: { id: input.cart_id },
    }).config({ name: "get-cart-and-metadata" });

    const itemInfo = transform({ cartData, input }, (transformData) => {
      const cart = transformData.cartData[0];
      const { item_id } = transformData.input;

      if (!cart) {
        throw new Error("Cart not found");
      }

      const lineItem = (cart.items || []).find(
        (item) => item?.id === item_id,
      );

      if (!lineItem) {
        throw new Error(`Line item with id ${item_id} not found in cart`);
      }

      const existingMetadata = (cart.metadata as unknown as CartMetadata) || {};

      return {
        lineItemId: lineItem.id as string,
        variantId: lineItem.variant_id as string | undefined,
        existingMetadata,
      };
    });

    deleteLineItemsWorkflow.runAsStep({
      input: transform({ input, itemInfo }, ({ input: inp, itemInfo: info }) => ({
        cart_id: inp.cart_id,
        ids: [info.lineItemId],
      })),
    });

    const metadataCleanup = transform(itemInfo, (info) => {
      const updatedOriginalCreatedAt = {
        ...(info.existingMetadata.item_original_created_at || {}),
      };
      if (info.variantId) {
        delete updatedOriginalCreatedAt[info.variantId];
      }
      return { item_original_created_at: updatedOriginalCreatedAt };
    });

    updateCartsStep([
      {
        id: input.cart_id,
        metadata: metadataCleanup as unknown as Record<string, unknown>,
      },
    ]).config({ name: "metadata-cleanup-for-deleted-item" });

    refreshCartItemsWorkflow.runAsStep({
      input: {
        cart_id: input.cart_id,
        force_refresh: true,
      },
    });

    syncUnselectedMetadataFromCatalogStep({ cart_id: input.cart_id });

    releaseLockStep({
      key: input.cart_id,
    });

    return new WorkflowResponse(
      transform(input, (inp) => ({ cart_id: inp.cart_id })),
    );
  },
);
