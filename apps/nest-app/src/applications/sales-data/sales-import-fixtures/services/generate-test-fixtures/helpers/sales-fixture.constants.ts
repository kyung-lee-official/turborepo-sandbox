export const SALES_DATA_SHEETS = {
  products: "Products",
  lineItems: "LineItems",
} as const;

export const INVENTORY_SHEET = "Inventory";

export const PRODUCTS_HEADERS = [
  "SKU",
  "Product Name",
  "Category",
  "Unit Price",
] as const;

export const LINE_ITEMS_HEADERS = [
  "Order ID",
  "SKU",
  "Quantity",
  "Sale Date",
] as const;

export const INVENTORY_HEADERS = ["SKU", "Inventory Qty"] as const;

export const ROWS_PER_SHEET = 50_000;
/** One JSONL line per catalog SKU — unique sku/description pairs only */
export const UNIQUE_SKU_COUNT = 5_000;
export const EXCEL_BATCH_SIZE = 10_000;
export const JSONL_BATCH_SIZE = 5_000;
/** Share of catalog SKUs omitted from Products in partially_available fixtures */
export const PARTIALLY_AVAILABLE_OMIT_EVERY_N_SKUS = 10;

export const FIXTURE_FILE_NAMES = {
  inventory: "inventory.xlsx",
  productDescriptions: "productDescriptions.jsonl",
} as const;

export const SALES_DATA_VARIANT_FILE_NAMES = {
  perfect: "salesData-perfect.xlsx",
  partially_available: "salesData-partially_available.xlsx",
  fail_fast: "salesData-fail_fast.xlsx",
} as const;

export const ALL_PRODUCTS_SHEET_VARIANTS = [
  "perfect",
  "partially_available",
  "fail_fast",
] as const;

export const MIME_TYPES = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jsonl: "application/x-ndjson",
} as const;

export const CATEGORIES = [
  "Electronics",
  "Office",
  "Home",
  "Apparel",
  "Sports",
] as const;

export const PRODUCT_NAME_PREFIXES = [
  "Pro",
  "Elite",
  "Basic",
  "Ultra",
  "Compact",
] as const;

export const PRODUCT_NAME_SUFFIXES = [
  "Mouse",
  "Keyboard",
  "Cable",
  "Adapter",
  "Stand",
  "Hub",
  "Monitor",
  "Headset",
] as const;

export const DESCRIPTION_ADJECTIVES = [
  "Wireless",
  "Ergonomic",
  "Portable",
  "Durable",
  "Premium",
  "Compact",
] as const;
