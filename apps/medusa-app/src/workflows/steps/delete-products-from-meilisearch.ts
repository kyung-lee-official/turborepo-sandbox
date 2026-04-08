import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { MEILISEARCH_MODULE } from "@/modules/meilisearch";
import type MeilisearchModuleService from "@/modules/meilisearch/service";

export type DeleteProductsStepInput = {
  ids: string[];
};

/**
 * Workflow step to delete unpublished products from Meilisearch index.
 * Includes compensation logic for rollback on failure.
 */
export const deleteProductsFromMeilisearchStep = createStep(
  "delete-products-from-meilisearch",
  async ({ ids }: DeleteProductsStepInput, { container }) => {
    const meilisearchService = container.resolve<MeilisearchModuleService>(
      MEILISEARCH_MODULE
    );

    if (!ids || ids.length === 0) {
      return new StepResponse(undefined, []);
    }

    const existingRecords =
      await meilisearchService.retrieveFromIndex(ids, "product");
    await meilisearchService.deleteFromIndex(ids, "product");

    return new StepResponse(undefined, existingRecords);
  },
  async (existingRecords: Record<string, unknown>[] | undefined, { container }) => {
    if (!existingRecords || existingRecords.length === 0) {
      return;
    }

    const meilisearchService = container.resolve<MeilisearchModuleService>(
      MEILISEARCH_MODULE
    );

    await meilisearchService.indexData(
      existingRecords as Record<string, unknown>[],
      "product"
    );
  }
);
