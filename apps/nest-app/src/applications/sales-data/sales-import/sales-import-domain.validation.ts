import Decimal from "decimal.js";
import type { ErrorDetail } from "@/import/shared/import-error.types";
import {
  SALES_IMPORT_ALLOW_NEGATIVE_INVENTORY_QTY,
  SALES_IMPORT_REQUIRE_SUPPLEMENT_BY_SKU,
} from "./sales-import-merge.policy";

export type ProductBySku = {
  productName: string;
  category: string;
  unitPrice: Decimal;
};

export type InventoryBySku = {
  inventoryQty: number;
};

export type MergedLineInsert = {
  sourceLineNumber: number;
  orderId: string;
  sku: string;
  quantity: number;
  saleDate: Date;
  productName: string;
  category: string;
  unitPrice: Decimal;
  inventoryQty: number;
  description: string;
};

function parseQuantityFromCell(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function parseSaleDateFromCell(text: string): Date | null {
  const trimmed = text.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1]!, 10);
  const month = Number.parseInt(match[2]!, 10);
  const day = Number.parseInt(match[3]!, 10);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function parseUnitPriceFromCell(text: string): Decimal | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return new Decimal(trimmed);
  } catch {
    return null;
  }
}

function formatCellsAsRawData(cells: Record<string, string>): string {
  return Object.entries(cells)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

export function mergeLineItemRow(
  rowNumber: number,
  cells: Record<string, string>,
  productsBySku: ReadonlyMap<string, ProductBySku>,
  inventoryBySku: ReadonlyMap<string, InventoryBySku>,
  descriptionsBySku: ReadonlyMap<string, string>,
): { ok: true; row: MergedLineInsert } | { ok: false; error: ErrorDetail } {
  const rawData = formatCellsAsRawData(cells);
  const sku = cells.SKU ?? "";
  const orderId = cells["Order ID"] ?? "";
  const quantityText = cells.Quantity ?? "";
  const saleDateText = cells["Sale Date"] ?? "";

  if (!sku) {
    return {
      ok: false,
      error: { message: "SKU is required", rowNumber, rawData },
    };
  }

  const quantity = parseQuantityFromCell(quantityText);
  if (quantity === null || quantity <= 0) {
    return {
      ok: false,
      error: {
        message: "Quantity must be a positive integer",
        rowNumber,
        rawData,
      },
    };
  }

  const saleDate = parseSaleDateFromCell(saleDateText);
  if (!saleDate) {
    return {
      ok: false,
      error: {
        message: "Sale Date must be YYYY-MM-DD",
        rowNumber,
        rawData,
      },
    };
  }

  const product = productsBySku.get(sku);
  if (SALES_IMPORT_REQUIRE_SUPPLEMENT_BY_SKU && !product) {
    return {
      ok: false,
      error: {
        message: `SKU not found in Products: ${sku}`,
        rowNumber,
        rawData,
      },
    };
  }

  const inventory = inventoryBySku.get(sku);
  if (SALES_IMPORT_REQUIRE_SUPPLEMENT_BY_SKU && !inventory) {
    return {
      ok: false,
      error: {
        message: `SKU not found in inventory: ${sku}`,
        rowNumber,
        rawData,
      },
    };
  }

  if (SALES_IMPORT_REQUIRE_SUPPLEMENT_BY_SKU && !descriptionsBySku.has(sku)) {
    return {
      ok: false,
      error: {
        message: `SKU not found in productDescriptions: ${sku}`,
        rowNumber,
        rawData,
      },
    };
  }

  const unitPrice = product?.unitPrice ?? new Decimal(0);
  if (unitPrice.isNegative()) {
    return {
      ok: false,
      error: {
        message: "Unit Price must not be negative",
        rowNumber,
        rawData,
      },
    };
  }

  const inventoryQty = inventory?.inventoryQty ?? 0;
  if (!SALES_IMPORT_ALLOW_NEGATIVE_INVENTORY_QTY && inventoryQty < 0) {
    return {
      ok: false,
      error: {
        message: "Inventory Qty must not be negative",
        rowNumber,
        rawData,
      },
    };
  }

  return {
    ok: true,
    row: {
      sourceLineNumber: rowNumber,
      orderId,
      sku,
      quantity,
      saleDate,
      productName: product?.productName ?? "",
      category: product?.category ?? "",
      unitPrice,
      inventoryQty,
      description: descriptionsBySku.get(sku) ?? "",
    },
  };
}

export function indexProductRow(
  cells: Record<string, string>,
): ProductBySku | null {
  const sku = cells.SKU ?? "";
  if (!sku) {
    return null;
  }

  const unitPrice = parseUnitPriceFromCell(cells["Unit Price"] ?? "");
  if (!unitPrice) {
    return null;
  }

  return {
    productName: cells["Product Name"] ?? "",
    category: cells.Category ?? "",
    unitPrice,
  };
}

export function indexInventoryRow(
  cells: Record<string, string>,
): InventoryBySku | null {
  const sku = cells.SKU ?? "";
  if (!sku) {
    return null;
  }

  const qty = parseQuantityFromCell(cells["Inventory Qty"] ?? "");
  if (qty === null) {
    return null;
  }

  return { inventoryQty: qty };
}
