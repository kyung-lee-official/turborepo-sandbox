import {
  CATEGORIES,
  PRODUCT_NAME_PREFIXES,
  PRODUCT_NAME_SUFFIXES,
  UNIQUE_SKU_COUNT,
} from "./sales-fixture.constants";

export type SkuPool = {
  readonly skus: readonly string[];
  readonly productNameBySku: ReadonlyMap<string, string>;
  readonly categoryBySku: ReadonlyMap<string, string>;
};

export function buildSkuPool(): SkuPool {
  const skus: string[] = [];
  const productNameBySku = new Map<string, string>();
  const categoryBySku = new Map<string, string>();

  for (let i = 1; i <= UNIQUE_SKU_COUNT; i++) {
    const sku = `SKU-${String(i).padStart(5, "0")}`;
    const prefix =
      PRODUCT_NAME_PREFIXES[i % PRODUCT_NAME_PREFIXES.length] ?? "Pro";
    const suffix =
      PRODUCT_NAME_SUFFIXES[i % PRODUCT_NAME_SUFFIXES.length] ?? "Item";
    const category = CATEGORIES[i % CATEGORIES.length] ?? "General";

    skus.push(sku);
    productNameBySku.set(sku, `${prefix} ${suffix} ${i}`);
    categoryBySku.set(sku, category);
  }

  return { skus, productNameBySku, categoryBySku };
}

export function skuFromPool(pool: SkuPool, index: number): string {
  return pool.skus[index % pool.skus.length] ?? pool.skus[0]!;
}
