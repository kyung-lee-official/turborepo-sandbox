import * as ExcelJS from "exceljs";
import { applyDefaultExportedSheetView } from "@/import/shared/apply-exported-sheet-view";
import type { ProductsSheetVariant } from "../../../dto/generate-test-fixtures.dto";
import {
  EXCEL_BATCH_SIZE,
  LINE_ITEMS_HEADERS,
  PARTIALLY_AVAILABLE_OMIT_EVERY_N_SKUS,
  PRODUCTS_HEADERS,
  ROWS_PER_SHEET,
  SALES_DATA_SHEETS,
} from "./sales-fixture.constants";
import { type SkuPool, skuFromPool } from "./sku-pool";

type BuildSalesDataOptions = {
  filepath: string;
  productsVariant: ProductsSheetVariant;
  pool: SkuPool;
};

function formatSaleDate(index: number): string {
  const day = (index % 28) + 1;
  return `2026-06-${String(day).padStart(2, "0")}`;
}

function catalogSkuNumber(sku: string): number {
  const match = /^SKU-(\d+)$/.exec(sku);
  return match ? Number.parseInt(match[1]!, 10) : 0;
}

function shouldOmitProductFromCatalog(
  variant: ProductsSheetVariant,
  sku: string,
): boolean {
  if (variant !== "partially_available") {
    return false;
  }
  return catalogSkuNumber(sku) % PARTIALLY_AVAILABLE_OMIT_EVERY_N_SKUS === 0;
}

async function writeProductsSheet(
  workbook: ExcelJS.Workbook,
  productsVariant: ProductsSheetVariant,
  pool: SkuPool,
) {
  const worksheet = workbook.addWorksheet(SALES_DATA_SHEETS.products);
  worksheet.columns = PRODUCTS_HEADERS.map((header) => ({
    header,
    key: header,
    width: header === "Product Name" ? 30 : 18,
    style: header === "Unit Price" ? { numFmt: "#,##0.00" } : undefined,
  }));

  for (
    let batchStart = 0;
    batchStart < ROWS_PER_SHEET;
    batchStart += EXCEL_BATCH_SIZE
  ) {
    const batch: Record<string, string | number>[] = [];
    const batchEnd = Math.min(batchStart + EXCEL_BATCH_SIZE, ROWS_PER_SHEET);

    for (let i = batchStart; i < batchEnd; i++) {
      const sku = skuFromPool(pool, i);
      if (shouldOmitProductFromCatalog(productsVariant, sku)) {
        continue;
      }

      const unitPrice = Number(((i % 500) + 1 + (i % 100) / 100).toFixed(2));
      batch.push({
        SKU: sku,
        "Product Name": pool.productNameBySku.get(sku) ?? `Item ${i}`,
        Category: pool.categoryBySku.get(sku) ?? "General",
        "Unit Price": unitPrice,
      });
    }

    if (batch.length > 0) {
      worksheet.addRows(batch);
    }
  }

  applyDefaultExportedSheetView(worksheet, PRODUCTS_HEADERS.length);
}

async function writeLineItemsSheet(workbook: ExcelJS.Workbook, pool: SkuPool) {
  const worksheet = workbook.addWorksheet(SALES_DATA_SHEETS.lineItems);
  worksheet.columns = LINE_ITEMS_HEADERS.map((header) => ({
    header,
    key: header,
    width: 18,
  }));

  for (
    let batchStart = 0;
    batchStart < ROWS_PER_SHEET;
    batchStart += EXCEL_BATCH_SIZE
  ) {
    const batch: Record<string, string | number>[] = [];
    const batchEnd = Math.min(batchStart + EXCEL_BATCH_SIZE, ROWS_PER_SHEET);

    for (let i = batchStart; i < batchEnd; i++) {
      const sku = skuFromPool(pool, i + 17);
      batch.push({
        "Order ID": `ORD-${String(i + 1).padStart(8, "0")}`,
        SKU: sku,
        Quantity: (i % 20) + 1,
        "Sale Date": formatSaleDate(i),
      });
    }

    worksheet.addRows(batch);
  }

  applyDefaultExportedSheetView(worksheet, LINE_ITEMS_HEADERS.length);
}

export async function buildSalesDataWorkbook(
  options: BuildSalesDataOptions,
): Promise<{ worksheets: string[]; rowCount: number }> {
  const workbook = new ExcelJS.Workbook();
  const worksheets: string[] = [];

  if (options.productsVariant !== "fail_fast") {
    await writeProductsSheet(workbook, options.productsVariant, options.pool);
    worksheets.push(SALES_DATA_SHEETS.products);
  }

  await writeLineItemsSheet(workbook, options.pool);
  worksheets.push(SALES_DATA_SHEETS.lineItems);

  await workbook.xlsx.writeFile(options.filepath);

  const rowCount = ROWS_PER_SHEET * worksheets.length + worksheets.length;

  return { worksheets, rowCount };
}
