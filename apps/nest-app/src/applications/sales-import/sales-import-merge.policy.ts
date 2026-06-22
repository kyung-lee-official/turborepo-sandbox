/**
 * sales-import application — merge and validation policy (LineItems base + SKU supplements).
 *
 * Merge: LineItems is base; Products, inventory.xlsx, and productDescriptions.jsonl
 * join by SKU. Missing supplement for a LineItems SKU → row error.
 *
 * Row errors: empty SKU, quantity ≤ 0, invalid Sale Date, negative Unit Price,
 * missing product/inventory/description for SKU.
 *
 * Negative Inventory Qty is allowed.
 *
 * Persistence: save valid rows; if any errors → validation_failed + error XLSX
 * (partial save).
 */

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
