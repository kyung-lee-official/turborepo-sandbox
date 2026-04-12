import type { Query } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import type { ICartModuleService } from "@medusajs/types";
import type { CartMetadata } from "@repo/types";
import { HttpError } from "@repo/types";

export type StripUnselectedForLineVariantInput = {
  cart_id: string;
  line_item_id: string;
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

/**
 * If the cart had both a line item and `metadata.unselected` for the same variant,
 * drop the unselected snapshot (not allowed) and log a warning.
 */
export const stripUnselectedForLineVariantStep = createStep(
  "strip-unselected-for-line-variant-step",
  async (input: StripUnselectedForLineVariantInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY) as Query;
    const cartModule = container.resolve(Modules.CART) as ICartModuleService;
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
      warn: (msg: string) => void;
    };

    const { data: cartRows } = await query.graph({
      entity: "cart",
      fields: ["*", "items.*", "metadata"],
      filters: { id: input.cart_id },
    });

    const cart = cartRows?.[0] as
      | {
          items?: { id?: string; variant_id?: string | null }[];
          metadata?: Record<string, unknown>;
        }
      | undefined;

    if (!cart) {
      throw new HttpError("CART.NOT_FOUND", "Cart not found");
    }

    const lineItem = (cart.items ?? []).find(
      (item) => item?.id === input.line_item_id,
    );
    if (!lineItem?.variant_id) {
      throw new HttpError(
        "CART.ITEM_NOT_FOUND",
        `Line item with id ${input.line_item_id} not found in cart`,
      );
    }

    const variantId = lineItem.variant_id as string;
    const meta = cart.metadata as unknown as CartMetadata | undefined;
    if (meta?.unselected?.[variantId]) {
      logger.warn(
        `[cart] Cart ${input.cart_id}: dropped metadata.unselected[${variantId}] while updating line ${input.line_item_id} (split state is not allowed).`,
      );
      await cartModule.updateCarts(input.cart_id, {
        metadata: stripUnselectedVariant(
          cart.metadata as Record<string, unknown>,
          variantId,
        ),
      });
    }

    return new StepResponse(null);
  },
);
