import { createWriteStream } from "node:fs";
import { finished } from "node:stream/promises";
import {
  DESCRIPTION_ADJECTIVES,
  JSONL_BATCH_SIZE,
  PRODUCT_NAME_SUFFIXES,
  UNIQUE_SKU_COUNT,
} from "./sales-fixture.constants";
import type { SkuPool } from "./sku-pool";

type BuildProductDescriptionsOptions = {
  filepath: string;
  pool: SkuPool;
};

function descriptionForLine(index: number, sku: string): string {
  const adjective =
    DESCRIPTION_ADJECTIVES[index % DESCRIPTION_ADJECTIVES.length] ?? "Premium";
  const suffix =
    PRODUCT_NAME_SUFFIXES[index % PRODUCT_NAME_SUFFIXES.length] ?? "item";
  return `${adjective} ${suffix} for ${sku}`;
}

export async function buildProductDescriptionsJsonl(
  options: BuildProductDescriptionsOptions,
): Promise<{ lineCount: number }> {
  const stream = createWriteStream(options.filepath, { encoding: "utf8" });
  const skus = options.pool.skus;

  let buffer = "";

  for (let i = 0; i < skus.length; i++) {
    const sku = skus[i]!;
    buffer += `${JSON.stringify({
      sku,
      description: descriptionForLine(i, sku),
    })}\n`;

    if ((i + 1) % JSONL_BATCH_SIZE === 0) {
      stream.write(buffer);
      buffer = "";
    }
  }

  if (buffer.length > 0) {
    stream.write(buffer);
  }

  stream.end();
  await finished(stream);

  return { lineCount: UNIQUE_SKU_COUNT };
}
