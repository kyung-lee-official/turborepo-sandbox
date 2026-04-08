import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { syncUnselectedMetadataFromCatalog } from "./sync-unselected-metadata-from-catalog";

/**
 * Workflow step: align `metadata.unselected` snapshots with current catalog (admin edits).
 * Run after {@link refreshCartItemsWorkflow} when serving cart JSON from custom workflows.
 */
export const syncUnselectedMetadataFromCatalogStep = createStep(
  "sync-unselected-metadata-from-catalog-step",
  async (input: { cart_id: string }, { container }) => {
    await syncUnselectedMetadataFromCatalog(input.cart_id, container);
    return new StepResponse(null);
  },
);
