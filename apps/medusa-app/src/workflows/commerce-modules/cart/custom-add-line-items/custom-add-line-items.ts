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
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import type { AdditionalData, IBigNumber } from "@medusajs/types";
import type { AddToCartWorkflowInputDTO } from "@medusajs/types/dist/cart/workflows";
import { type CartMetadata, HttpError } from "@repo/types";
import { syncUnselectedMetadataFromCatalogStep } from "@/api/store-api/carts/sync-unselected-metadata-from-catalog-step";

export const customAddToCartWorkflow = createWorkflow(
  "custom-add-to-cart",
  (input: AddToCartWorkflowInputDTO & AdditionalData) => {
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    });

    const { data: existingCartData } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "metadata"],
      filters: { id: input.cart_id },
    }).config({ name: "get-existing-cart-metadata" });

    const addQuantity = transform(
      { existingCartData, input },
      (transformData) => {
        const cart = transformData.existingCartData[0];
        if (!cart) {
          throw new HttpError("CART.NOT_FOUND", "Cart not found");
        }

        const { quantity, variant_id } = transformData.input.items[0];
        const inputQty = (quantity as IBigNumber).valueOf();
        const metadata = cart.metadata as unknown as CartMetadata;

        if (metadata?.unselected?.[variant_id!]) {
          throw new HttpError(
            "CART.USE_VARIANT_QUANTITY_ENDPOINT",
            "Use POST /store-api/carts/:id/variants/:variant_id/quantity to set absolute quantity when this variant exists in unselected metadata.",
          );
        }

        return inputQty;
      },
    );

    addToCartWorkflow.runAsStep({
      input: {
        cart_id: input.cart_id,
        items: [
          {
            variant_id: input.items[0].variant_id,
            quantity: addQuantity,
          },
        ],
      },
    });

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
