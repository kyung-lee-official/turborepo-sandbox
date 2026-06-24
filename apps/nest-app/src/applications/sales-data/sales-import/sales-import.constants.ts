import {
  SALES_IMPORT_ALLOW_NEGATIVE_INVENTORY_QTY,
  SALES_IMPORT_DOMAIN_KIND,
  SALES_IMPORT_REQUIRE_SUPPLEMENT_BY_SKU,
  SALES_IMPORT_SHEETS,
  SALES_IMPORT_SOURCE_IDS,
} from "./sales-import-merge.policy";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const;

export const salesImportSourceSpecs = [
  { sourceId: SALES_IMPORT_SOURCE_IDS.salesData, required: true },
  { sourceId: SALES_IMPORT_SOURCE_IDS.inventory, required: true },
  {
    sourceId: SALES_IMPORT_SOURCE_IDS.productDescriptions,
    required: true,
  },
] as const;

export const salesImportUploadPolicy = {
  allowedMimeBySourceId: {
    [SALES_IMPORT_SOURCE_IDS.salesData]: [
      XLSX_MIME,
      "application/octet-stream",
    ],
    [SALES_IMPORT_SOURCE_IDS.inventory]: [
      XLSX_MIME,
      "application/octet-stream",
    ],
    [SALES_IMPORT_SOURCE_IDS.productDescriptions]: [
      "application/x-ndjson",
      "application/json",
      "application/octet-stream",
    ],
  },
} as const;

export const salesImportProductsSheetSpec = {
  sheetName: SALES_IMPORT_SHEETS.products,
  headers: ["SKU", "Product Name", "Category", "Unit Price"] as const,
} as const;

export const salesImportLineItemsSheetSpec = {
  sheetName: SALES_IMPORT_SHEETS.lineItems,
  headers: ["Order ID", "SKU", "Quantity", "Sale Date"] as const,
} as const;

export const salesImportInventorySheetSpec = {
  sheetName: SALES_IMPORT_SHEETS.inventory,
  headers: ["SKU", "Inventory Qty"] as const,
} as const;

export {
  SALES_IMPORT_ALLOW_NEGATIVE_INVENTORY_QTY,
  SALES_IMPORT_DOMAIN_KIND,
  SALES_IMPORT_REQUIRE_SUPPLEMENT_BY_SKU,
  SALES_IMPORT_SHEETS,
  SALES_IMPORT_SOURCE_IDS,
};
