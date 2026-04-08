import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { MEILISEARCH_MODULE } from "@/modules/meilisearch";
import type MeilisearchModuleService from "@/modules/meilisearch/service";

export type SyncProductsStepInput = {
  products: {
    id: string;
    title: string;
    description?: string;
    handle: string;
    thumbnail?: string;
    categories: {
      id: string;
      name: string;
      handle: string;
    }[];
    tags: {
      id: string;
      value: string;
    }[];
  }[];
};

type CompensationData = {
  newProducts?: string[];
  existingProducts?: Record<string, unknown>[];
};

/**
 * Workflow step to sync published products to Meilisearch index.
 * Includes compensation logic for rollback on failure.
 */
export const syncProductsToMeilisearchStep = createStep(
  "sync-products-to-meilisearch",
  async ({ products }: SyncProductsStepInput, { container }) => {
    const meilisearchService =
      container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);

    if (!products || products.length === 0) {
      return new StepResponse(undefined, {});
    }

    const productIds = products.map((p) => p.id);
    const existingProducts = await meilisearchService.retrieveFromIndex(
      productIds,
      "product",
    );

    const newProducts = products.filter(
      (product) => !existingProducts.some((p) => p?.id === product.id),
    );

    await meilisearchService.indexData(
      products as unknown as Record<string, unknown>[],
      "product",
    );

    return new StepResponse(undefined, {
      newProducts: newProducts.map((p) => p.id),
      existingProducts,
    } as CompensationData);
  },
  async (compensation: CompensationData | undefined, { container }) => {
    if (!compensation) {
      return;
    }

    const meilisearchService =
      container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);

    if (compensation.newProducts && compensation.newProducts.length > 0) {
      await meilisearchService.deleteFromIndex(
        compensation.newProducts,
        "product",
      );
    }

    if (
      compensation.existingProducts &&
      compensation.existingProducts.length > 0
    ) {
      await meilisearchService.indexData(
        compensation.existingProducts,
        "product",
      );
    }
  },
);
