import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { syncProductsToMeilisearchWorkflow } from "@/workflows/sync-products-to-meilisearch";

/**
 * Subscriber that handles "meilisearch.sync" events.
 * Indexes all products from database to Meilisearch in batches.
 */
export default async function handleMeilisearchSync({
  container,
}: SubscriberArgs) {
  const logger = container.resolve("logger");

  let hasMore = true;
  let offset = 0;
  const limit = 50;

  logger.info("Meilisearch sync: Starting product indexing");

  try {
    while (hasMore) {
      const {
        result: { products, metadata },
      } = await syncProductsToMeilisearchWorkflow(container).run({
        input: { limit, offset },
      });

      hasMore = offset + limit < (metadata?.count ?? 0);
      offset += limit;

      logger.debug(
        `Meilisearch sync: Processed batch at offset ${offset}, total products: ${products.length}`,
      );
    }

    logger.info(
      `Meilisearch sync: Successfully indexed all products (total: ${offset})`,
    );
  } catch (error) {
    logger.error(
      "Meilisearch sync: Error during product indexing",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}

export const config: SubscriberConfig = {
  event: "meilisearch.sync",
};
