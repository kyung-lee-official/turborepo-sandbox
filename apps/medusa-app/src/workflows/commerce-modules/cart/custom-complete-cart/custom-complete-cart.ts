import { logger } from "@medusajs/framework";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  addToCartWorkflow,
  completeCartWorkflow,
  createCartWorkflow,
  refreshCartItemsWorkflow,
  releaseLockStep,
} from "@medusajs/medusa/core-flows";
import type { CompleteCartWorkflowInputDTO } from "@medusajs/types/dist/cart/workflows";
import { HttpError } from "@repo/types";
import { syncUnselectedMetadataFromCatalogStep } from "@/api/store-api/carts/sync-unselected-metadata-from-catalog-step";
import { linkCheckoutToRescueCartStep } from "./steps/link-checkout-to-rescue-cart-step";
import { prepareMigrateUnselectedToRescueCartStep } from "./steps/prepare-migrate-unselected-to-rescue-cart";

/**
 * Completes a checkout cart after payment. For logged-in customers with
 * `metadata.unselected`, copies those lines to a new rescue cart first (with
 * idempotency via `metadata.rescue_cart_id`), then runs Medusa's official
 * {@link completeCartWorkflow}. Guest carts ignore unselected entries.
 *
 * Create/add cart lines use `createCartWorkflow` / `addToCartWorkflow` as
 * `runAsStep` in this workflow (not nested inside a single `createStep`).
 *
 * Use from payment-provider webhooks (not the optional HTTP complete-cart route).
 */
export const customCompleteCartWorkflow = createWorkflow(
  "custom-complete-cart",
  (input: CompleteCartWorkflowInputDTO) => {
    acquireLockStep({
      key: input.id,
      timeout: 30,
      ttl: 120,
    });

    const migratePrepare = prepareMigrateUnselectedToRescueCartStep({
      checkout_cart_id: input.id,
    });

    when(migratePrepare, (p) => p.action === "create").then(() => {
      const createCartInput = transform(migratePrepare, (prep) => {
        if (prep.action !== "create") {
          const message =
            "Invariant: migrate prepare must be action create in this branch";
          logger.error(message);
          throw new HttpError("SYSTEM.MISCONFIGURED", message);
        }
        return prep.create_cart_input;
      });

      const createdCart = createCartWorkflow.runAsStep({
        input: createCartInput,
      });

      const addToCartInput = transform(
        { migratePrepare, createdCart },
        ({ migratePrepare: prep, createdCart: created }) => {
          if (prep.action !== "create") {
            const message =
              "Invariant: migrate prepare must be action create in this branch";
            logger.error(message);
            throw new HttpError("SYSTEM.MISCONFIGURED", message);
          }
          return {
            cart_id: created.id,
            items: prep.items,
          };
        },
      );

      addToCartWorkflow.runAsStep({
        input: addToCartInput,
      });

      const linkInput = transform(
        { migratePrepare, createdCart },
        ({ migratePrepare: prep, createdCart: created }) => {
          if (prep.action !== "create") {
            const message =
              "Invariant: migrate prepare must be action create in this branch";
            logger.error(message);
            throw new HttpError("SYSTEM.MISCONFIGURED", message);
          }
          return {
            checkout_cart_id: prep.checkout_cart_id,
            rescue_cart_id: created.id,
            metadata_for_link: prep.metadata_for_link,
          };
        },
      );

      linkCheckoutToRescueCartStep(linkInput);
    });

    refreshCartItemsWorkflow.runAsStep({
      input: {
        cart_id: input.id,
        force_refresh: true,
      },
    });

    syncUnselectedMetadataFromCatalogStep({ cart_id: input.id });

    const result = completeCartWorkflow.runAsStep({
      input: {
        id: input.id,
      },
    });

    releaseLockStep({
      key: input.id,
    });

    return new WorkflowResponse(result);
  },
);
