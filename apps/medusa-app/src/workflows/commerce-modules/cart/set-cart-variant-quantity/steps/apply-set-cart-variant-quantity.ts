import type { Query } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import type { ICartModuleService } from "@medusajs/types";
import {
  addToCartWorkflow,
  deleteLineItemsWorkflow,
  refreshCartItemsWorkflow,
  updateLineItemInCartWorkflow,
} from "@medusajs/medusa/core-flows";
import type { CartMetadata } from "@repo/types";
import { HttpError } from "@repo/types";
import { syncUnselectedMetadataFromCatalog } from "@/api/store-api/carts/sync-unselected-metadata-from-catalog";

export type ApplySetCartVariantQuantityInput = {
  cart_id: string;
  variant_id: string;
  quantity: number;
};

function stripUnselectedVariant(
  raw: Record<string, unknown> | null | undefined,
  variantId: string,
): Record<string, unknown> {
  const meta = { ...(raw ?? {}) } as Record<string, unknown>;
  const unselected = {
    ...((meta.unselected as Record<string, unknown>) ?? {}),
  };
  delete unselected[variantId];
  meta.unselected = unselected;
  return meta;
}

export const applySetCartVariantQuantityStep = createStep(
  "apply-set-cart-variant-quantity-step",
  async (input: ApplySetCartVariantQuantityInput, { container }) => {
    const { cart_id, variant_id, quantity } = input;

    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new HttpError(
        "CART.INVALID_QUANTITY",
        "quantity must be a non-negative integer",
      );
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY) as Query;
    const cartModule = container.resolve(Modules.CART) as ICartModuleService;
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
      warn: (msg: string) => void;
    };

    const { data: cartRows } = await query.graph({
      entity: "cart",
      fields: ["*", "items.*"],
      filters: { id: cart_id },
    });

    const cart = cartRows?.[0] as
      | {
          id?: string;
          items?: { id?: string; variant_id?: string | null }[];
          metadata?: Record<string, unknown>;
        }
      | undefined;

    if (!cart?.id) {
      throw new HttpError("CART.NOT_FOUND", "Cart not found");
    }

    const items = (cart.items ?? []).filter(
      (i) => i?.variant_id === variant_id && i?.id,
    );
    const lineIds = items.map((i) => i.id as string);

    const meta = cart.metadata as Record<string, unknown> | undefined;
    const unselected = (meta?.unselected ?? {}) as CartMetadata["unselected"];
    const hadUnselected = !!unselected[variant_id];
    const hadSplit = lineIds.length > 0 && hadUnselected;

    if (hadSplit) {
      logger.warn(
        `[cart] Cart ${cart_id}: dropped metadata.unselected[${variant_id}] because line item(s) already existed (split state is not allowed).`,
      );
    }

    const newMetadata = stripUnselectedVariant(meta, variant_id);
    await cartModule.updateCarts(cart_id, {
      metadata: newMetadata,
    });

    if (quantity === 0) {
      if (lineIds.length > 0) {
        await deleteLineItemsWorkflow(container).run({
          input: { cart_id, ids: lineIds },
        });
      }
    } else if (lineIds.length === 1) {
      await updateLineItemInCartWorkflow(container).run({
        input: {
          cart_id,
          item_id: lineIds[0],
          update: { quantity },
        },
      });
    } else if (lineIds.length > 1) {
      await deleteLineItemsWorkflow(container).run({
        input: { cart_id, ids: lineIds },
      });
      await addToCartWorkflow(container).run({
        input: {
          cart_id,
          items: [{ variant_id, quantity }],
        },
      });
    } else {
      await addToCartWorkflow(container).run({
        input: {
          cart_id,
          items: [{ variant_id, quantity }],
        },
      });
    }

    await refreshCartItemsWorkflow(container).run({
      input: { cart_id, force_refresh: true },
    });

    await syncUnselectedMetadataFromCatalog(cart_id, container);

    return new StepResponse(null);
  },
);
