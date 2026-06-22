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
export const PARTIAL_INVALID_RATE = 0.1;

export const FIXTURE_FILE_NAMES = {
  salesData: "salesData.xlsx",
  inventory: "inventory.xlsx",
  productDescriptions: "productDescriptions.jsonl",
} as const;

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
