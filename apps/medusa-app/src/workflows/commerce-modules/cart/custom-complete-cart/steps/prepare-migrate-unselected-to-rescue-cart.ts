import { Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import type { ICartModuleService } from "@medusajs/types";
import type { CartMetadata } from "@repo/types";
import { HttpError } from "@repo/types";

export type PrepareMigrateUnselectedToRescueCartInput = {
  checkout_cart_id: string;
};

/** Prepare result: drive follow-up steps in the parent workflow (no nested workflows here). */
export type PrepareMigrateUnselectedResult =
  | { action: "skip" }
  | { action: "reuse"; rescue_cart_id: string }
  | {
      action: "create";
      checkout_cart_id: string;
      metadata_for_link: Record<string, unknown>;
      create_cart_input: {
        customer_id: string;
        region_id: string;
        currency_code: string;
        sales_channel_id: string | undefined;
        email: string | undefined;
        metadata: Record<string, unknown>;
      };
      items: { variant_id: string; quantity: number }[];
    };

function normalizeMetadata(
  raw: Record<string, unknown> | null | undefined,
): CartMetadata {
  const base = (raw ?? {}) as Partial<CartMetadata>;
  return {
    unselected: base.unselected ?? {},
    ...(base.rescue_cart_id ? { rescue_cart_id: base.rescue_cart_id } : {}),
    ...(base.source_checkout_cart_id
      ? { source_checkout_cart_id: base.source_checkout_cart_id }
      : {}),
  };
}

function hasPositiveUnselected(metadata: CartMetadata): boolean {
  return Object.entries(metadata.unselected).some(
    ([, entry]) => (entry?.quantity ?? 0) > 0,
  );
}

/**
 * Reads checkout cart metadata, handles idempotent reuse / stale rescue ref cleanup,
 * and when needed outputs payloads for {@link createCartWorkflow} + {@link addToCartWorkflow}
 * executed as `runAsStep` siblings in the parent workflow.
 */
export const prepareMigrateUnselectedToRescueCartStep = createStep(
  "prepare-migrate-unselected-to-rescue-cart-step",
  async (
    { checkout_cart_id }: PrepareMigrateUnselectedToRescueCartInput,
    { container },
  ) => {
    const cartModule = container.resolve(Modules.CART) as ICartModuleService;
    const checkoutCart = await cartModule.retrieveCart(checkout_cart_id);

    if (!checkoutCart) {
      throw new HttpError("CART.NOT_FOUND", "Checkout cart not found");
    }

    const metadata = normalizeMetadata(
      checkoutCart.metadata as Record<string, unknown> | undefined,
    );

    if (!checkoutCart.customer_id || !hasPositiveUnselected(metadata)) {
      return new StepResponse<PrepareMigrateUnselectedResult, null>(
        { action: "skip" },
        null,
      );
    }

    const customerId = checkoutCart.customer_id;
    const regionId = checkoutCart.region_id;
    const currencyCode = checkoutCart.currency_code;
    if (!regionId || !currencyCode) {
      throw new HttpError(
        "SYSTEM.MISCONFIGURED",
        "Checkout cart must have region_id and currency_code to create a rescue cart",
      );
    }

    const existingRescueId = metadata.rescue_cart_id;
    if (existingRescueId) {
      const existing = await cartModule.listCarts(
        { id: [existingRescueId] },
        { take: 1 },
      );
      if (existing.length > 0) {
        return new StepResponse<PrepareMigrateUnselectedResult, null>(
          { action: "reuse", rescue_cart_id: existingRescueId },
          null,
        );
      }

      const { rescue_cart_id: _stale, ...rest } = metadata;
      await cartModule.updateCarts(checkout_cart_id, {
        metadata: { ...rest, unselected: metadata.unselected } as Record<
          string,
          unknown
        >,
      });
    }

    const items: { variant_id: string; quantity: number }[] = [];
    for (const [variant_id, entry] of Object.entries(metadata.unselected)) {
      const quantity = entry?.quantity ?? 0;
      if (quantity <= 0) continue;
      items.push({ variant_id, quantity });
    }

    const metadataForLink = {
      ...metadata,
    } as Record<string, unknown>;

    const payload: PrepareMigrateUnselectedResult = {
      action: "create",
      checkout_cart_id,
      metadata_for_link: metadataForLink,
      create_cart_input: {
        customer_id: customerId,
        region_id: regionId,
        currency_code: currencyCode,
        sales_channel_id: checkoutCart.sales_channel_id ?? undefined,
        email: checkoutCart.email ?? undefined,
        metadata: {
          unselected: {},
          source_checkout_cart_id: checkout_cart_id,
        },
      },
      items,
    };

    return new StepResponse<PrepareMigrateUnselectedResult, null>(
      payload,
      null,
    );
  },
);
