import { createWriteStream } from "node:fs";
import { finished } from "node:stream/promises";
import type { TestFixtureScenario } from "../../dto/generate-test-fixtures.dto";
import {
  DESCRIPTION_ADJECTIVES,
  JSONL_BATCH_SIZE,
  JSONL_LINE_COUNT,
  PARTIAL_INVALID_RATE,
  PRODUCT_NAME_SUFFIXES,
} from "./sales-fixture.constants";
import { skuFromPool, type SkuPool } from "./sku-pool";

type BuildProductDescriptionsOptions = {
  filepath: string;
  scenario: TestFixtureScenario;
  pool: SkuPool;
};

function shouldInvalidate(scenario: TestFixtureScenario): boolean {
  return scenario === "partial" && Math.random() < PARTIAL_INVALID_RATE;
}

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

  let buffer = "";

  for (let i = 0; i < JSONL_LINE_COUNT; i++) {
    const sku = skuFromPool(options.pool, i + 7);
    const invalidate =
      shouldInvalidate(options.scenario) ||
      (options.scenario === "partial" && i === 0);

    let lineSku = sku;
    let description = descriptionForLine(i, sku);

    if (invalidate) {
      if (i % 2 === 0) {
        lineSku = "";
      } else {
        description = "";
      }
    }

    buffer += `${JSON.stringify({ sku: lineSku, description })}\n`;

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

  return { lineCount: JSONL_LINE_COUNT };
}
