import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import type { DeleteLineItemsWorkflowInput } from "@medusajs/medusa/core-flows";
import {
  acquireLockStep,
  deleteLineItemsWorkflow,
  refreshCartItemsWorkflow,
  releaseLockStep,
  updateCartsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import type { CartMetadata, CartUnselectedEntry } from "@repo/types";
import { syncUnselectedMetadataFromCatalogStep } from "@/api/store-api/carts/sync-unselected-metadata-from-catalog-step";

function snapshotNum(value: unknown): number | undefined {
  if (value == null) {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export const customUnselectCartItemWorkflow = createWorkflow(
  "custom-unselect-cart-item",
  (input: DeleteLineItemsWorkflowInput) => {
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    });

    const { data } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "items.*"],
      filters: { id: input.cart_id },
    }).config({ name: "get-variants" });

    const metadataToUpdate = transform({ data, input }, (transformData) => {
      const updatedCart = transformData.data[0];
      const existingMetadata =
        (updatedCart?.metadata as unknown as CartMetadata) || {};
      const existingUnselected = existingMetadata.unselected || {};

      const existingOriginalCreatedAt =
        existingMetadata.item_original_created_at ?? {};
      const updatedOriginalCreatedAt = { ...existingOriginalCreatedAt };

      const lineItemsToUnselect = (updatedCart.items || []).filter(
        (item) => !!item?.id && transformData.input.ids.includes(item.id),
      );

      const newlyUnselected = lineItemsToUnselect.reduce(
        (acc, item) => {
          const lineTotals = item as Record<string, unknown>;
          if (item?.variant_id) {
            const originalCreatedAt =
              existingOriginalCreatedAt[item.variant_id] ??
              (item.created_at
                ? new Date(item.created_at).toISOString()
                : new Date().toISOString());

            const compareAt =
              item.compare_at_unit_price != null
                ? Number(item.compare_at_unit_price)
                : null;

            acc[item.variant_id] = {
              quantity: item.quantity,
              created_at: originalCreatedAt,
              title: item.title,
              subtitle: item.subtitle ?? null,
              variant_title: item.variant_title ?? null,
              variant_sku: item.variant_sku ?? null,
              unit_price: Number(item.unit_price),
              compare_at_unit_price:
                compareAt != null && Number.isFinite(compareAt)
                  ? compareAt
                  : null,
              is_tax_inclusive: Boolean(item.is_tax_inclusive),
              original_subtotal: snapshotNum(lineTotals.original_subtotal),
              subtotal: snapshotNum(lineTotals.subtotal),
              original_total: snapshotNum(lineTotals.original_total),
              total: snapshotNum(lineTotals.total),
              original_item_subtotal: snapshotNum(
                lineTotals.original_item_subtotal,
              ),
              item_subtotal: snapshotNum(lineTotals.item_subtotal),
              original_item_total: snapshotNum(lineTotals.original_item_total),
              item_total: snapshotNum(lineTotals.item_total),
              thumbnail: item.thumbnail ?? null,
            };

            if (!updatedOriginalCreatedAt[item.variant_id]) {
              updatedOriginalCreatedAt[item.variant_id] = originalCreatedAt;
            }
          }
          return acc;
        },
        {} as Record<string, CartUnselectedEntry>,
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

    deleteLineItemsWorkflow.runAsStep({
      input: {
        cart_id: input.cart_id,
        ids: input.ids,
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
