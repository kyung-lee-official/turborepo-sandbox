import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  deleteLineItemsWorkflow,
  refreshCartItemsWorkflow,
  releaseLockStep,
  updateLineItemInCartWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import { HttpError } from "@repo/types";
import { syncUnselectedMetadataFromCatalogStep } from "@/api/store-api/carts/sync-unselected-metadata-from-catalog-step";
import { stripUnselectedForLineVariantStep } from "./steps/strip-unselected-for-line-variant";

type CustomUpdateLineItemInput = {
  cart_id: string;
  line_item_id: string;
  quantity: number;
};

export const customUpdateLineItemWorkflow = createWorkflow(
  "custom-update-line-item",
  (input: CustomUpdateLineItemInput) => {
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    });

    stripUnselectedForLineVariantStep({
      cart_id: input.cart_id,
      line_item_id: input.line_item_id,
    });

    const { data: existingCartData } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "items.*", "metadata"],
      filters: { id: input.cart_id },
    }).config({ name: "get-existing-cart-with-items" });

    const updateData = transform(
      { existingCartData, input },
      (transformData) => {
        const cart = transformData.existingCartData[0];
        const { line_item_id, quantity } = transformData.input;

        if (!cart) {
          throw new HttpError("CART.NOT_FOUND", "Cart not found");
        }

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

    when(updateData, (data) => data.quantity > 0).then(() => {
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
      return deleteLineItemsWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
          ids: [updateData.line_item_id],
        },
      });
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
