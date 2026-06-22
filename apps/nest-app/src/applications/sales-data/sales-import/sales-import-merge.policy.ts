/** Merge, validation, and persistence policy — see README.md in this folder. */

/** DomainRegistry key for async processing */
export const SALES_IMPORT_DOMAIN_KIND = "sales-report" as const;

export const SALES_IMPORT_SOURCE_IDS = {
  salesData: "salesData",
  inventory: "inventory",
  productDescriptions: "productDescriptions",
} as const;

export const SALES_IMPORT_SHEETS = {
  products: "Products",
  lineItems: "LineItems",
  inventory: "Inventory",
} as const;

/** Missing Products / inventory / JSONL entry for LineItems SKU → row error */
export const SALES_IMPORT_REQUIRE_SUPPLEMENT_BY_SKU = true;

/** Negative Inventory Qty allowed; negative Unit Price → row error */
export const SALES_IMPORT_ALLOW_NEGATIVE_INVENTORY_QTY = true;
