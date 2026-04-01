import { logger } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import type { ICartModuleService } from "@medusajs/types";

export type LinkCheckoutToRescueCartInput = {
  checkout_cart_id: string;
  rescue_cart_id: string;
  metadata_for_link: Record<string, unknown>;
};

type LinkCheckoutCompensation = {
  rescue_cart_id: string;
};

/**
 * Persist rescue cart id on the checkout cart after create + add steps succeed.
 * Compensation deletes the rescue cart if the workflow rolls back after linking (best-effort).
 */
export const linkCheckoutToRescueCartStep = createStep(
  "link-checkout-to-rescue-cart-step",
  async (input: LinkCheckoutToRescueCartInput, { container }) => {
    const cartModule = container.resolve(Modules.CART) as ICartModuleService;
    await cartModule.updateCarts(input.checkout_cart_id, {
      metadata: {
        ...input.metadata_for_link,
        rescue_cart_id: input.rescue_cart_id,
      } as Record<string, unknown>,
    });

    return new StepResponse<true, LinkCheckoutCompensation>(true, {
      rescue_cart_id: input.rescue_cart_id,
    });
  },
  async (compensation, { container }) => {
    if (!compensation?.rescue_cart_id) return;
    const cartModule = container.resolve(Modules.CART) as ICartModuleService;
    try {
      await cartModule.deleteCarts(compensation.rescue_cart_id);
    } catch (error: unknown) {
      logger.error(
        `link-checkout-to-rescue-cart: compensation failed to delete rescue cart ${compensation.rescue_cart_id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
);
