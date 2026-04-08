import {
  createWorkflow,
  transform,
  type WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { useQueryGraphStep } from "@medusajs/medusa/core-flows";
import { deleteProductsFromMeilisearchStep } from "./steps/delete-products-from-meilisearch";
import {
  type SyncProductsStepInput,
  syncProductsToMeilisearchStep,
} from "./steps/sync-products-to-meilisearch";

type SyncProductsWorkflowInput = {
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
};

/**
 * Workflow to sync product data from database to Meilisearch.
 * - Fetches products from database
 * - Splits by publication status (published vs unpublished)
 * - Syncs published products to index
 * - Removes unpublished products from index
 */
export const syncProductsToMeilisearchWorkflow = createWorkflow(
  "sync-products-to-meilisearch",
  ({ filters, limit, offset }: SyncProductsWorkflowInput) => {
    const { data: products, metadata } = useQueryGraphStep({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "handle",
        "thumbnail",
        "categories.id",
        "categories.name",
        "categories.handle",
        "tags.id",
        "tags.value",
        "status",
      ],
      pagination: {
        take: limit,
        skip: offset,
      },
      filters,
    });

    const { publishedProducts, unpublishedProductIds } = transform(
      {
        products,
      },
      (data) => {
        const publishedProducts: SyncProductsStepInput["products"] = [];
        const unpublishedProductIds: string[] = [];

        data.products.forEach((product) => {
          if (product.status === "published") {
            const { status, ...rest } = product;
            publishedProducts.push(
              rest as SyncProductsStepInput["products"][0]
            );
          } else {
            unpublishedProductIds.push(product.id);
          }
        });

        return {
          publishedProducts,
          unpublishedProductIds,
        };
      }
    );

    syncProductsToMeilisearchStep({
      products: publishedProducts,
    });

    deleteProductsFromMeilisearchStep({
      ids: unpublishedProductIds,
    });

    return new WorkflowResponse({
      products: products as WorkflowData[],
      metadata,
    });
  }
);
