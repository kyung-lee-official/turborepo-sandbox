import * as ExcelJS from "exceljs";
import type { TestFixtureScenario } from "../../../dto/generate-test-fixtures.dto";
import { applyDefaultExportedSheetView } from "./apply-exported-sheet-view";
import {
  EXCEL_BATCH_SIZE,
  LINE_ITEMS_HEADERS,
  PARTIAL_INVALID_RATE,
  PRODUCTS_HEADERS,
  ROWS_PER_SHEET,
  SALES_DATA_SHEETS,
} from "./sales-fixture.constants";
import { skuFromPool, unknownSku, type SkuPool } from "./sku-pool";

type BuildSalesDataOptions = {
  filepath: string;
  scenario: TestFixtureScenario;
  pool: SkuPool;
  includeLineItemsSheet: boolean;
};

function shouldInvalidate(scenario: TestFixtureScenario): boolean {
  return scenario === "partial" && Math.random() < PARTIAL_INVALID_RATE;
}

function formatSaleDate(index: number): string {
  const day = (index % 28) + 1;
  return `2026-06-${String(day).padStart(2, "0")}`;
}

async function writeProductsSheet(
  workbook: ExcelJS.Workbook,
  scenario: TestFixtureScenario,
  pool: SkuPool,
) {
  const worksheet = workbook.addWorksheet(SALES_DATA_SHEETS.products);
  worksheet.columns = PRODUCTS_HEADERS.map((header) => ({
    header,
    key: header,
    width: header === "Product Name" ? 30 : 18,
    style: header === "Unit Price" ? { numFmt: "#,##0.00" } : undefined,
  }));

  for (let batchStart = 0; batchStart < ROWS_PER_SHEET; batchStart += EXCEL_BATCH_SIZE) {
    const batch: Record<string, string | number>[] = [];
    const batchEnd = Math.min(batchStart + EXCEL_BATCH_SIZE, ROWS_PER_SHEET);

    for (let i = batchStart; i < batchEnd; i++) {
      const sku = skuFromPool(pool, i);
      const invalidate =
        shouldInvalidate(scenario) || (scenario === "partial" && i === 0);

      let rowSku = sku;
      let unitPrice = Number(((i % 500) + 1 + (i % 100) / 100).toFixed(2));
      let productName = pool.productNameBySku.get(sku) ?? `Item ${i}`;
      const category = pool.categoryBySku.get(sku) ?? "General";

      if (invalidate) {
        const defect = i % 3;
        if (defect === 0) {
          rowSku = "";
        } else if (defect === 1) {
          unitPrice = -unitPrice;
        } else {
          productName = "";
        }
      }

      batch.push({
        SKU: rowSku,
        "Product Name": productName,
        Category: category,
        "Unit Price": unitPrice,
      });
    }

    worksheet.addRows(batch);
  }

  applyDefaultExportedSheetView(worksheet, PRODUCTS_HEADERS.length);
}

async function writeLineItemsSheet(
  workbook: ExcelJS.Workbook,
  scenario: TestFixtureScenario,
  pool: SkuPool,
) {
  const worksheet = workbook.addWorksheet(SALES_DATA_SHEETS.lineItems);
  worksheet.columns = LINE_ITEMS_HEADERS.map((header) => ({
    header,
    key: header,
    width: 18,
  }));

  for (let batchStart = 0; batchStart < ROWS_PER_SHEET; batchStart += EXCEL_BATCH_SIZE) {
    const batch: Record<string, string | number>[] = [];
    const batchEnd = Math.min(batchStart + EXCEL_BATCH_SIZE, ROWS_PER_SHEET);

    for (let i = batchStart; i < batchEnd; i++) {
      const sku = skuFromPool(pool, i + 17);
      const invalidate =
        shouldInvalidate(scenario) || (scenario === "partial" && i === 0);

      let rowSku = sku;
      let quantity = (i % 20) + 1;
      let saleDate = formatSaleDate(i);

      if (invalidate) {
        const defect = i % 3;
        if (defect === 0) {
          quantity = 0;
        } else if (defect === 1) {
          saleDate = "not-a-date";
        } else {
          rowSku = unknownSku(i);
        }
      }

      batch.push({
        "Order ID": `ORD-${String(i + 1).padStart(8, "0")}`,
        SKU: rowSku,
        Quantity: quantity,
        "Sale Date": saleDate,
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

  await writeProductsSheet(workbook, options.scenario, options.pool);
  worksheets.push(SALES_DATA_SHEETS.products);

  if (options.includeLineItemsSheet) {
    await writeLineItemsSheet(workbook, options.scenario, options.pool);
    worksheets.push(SALES_DATA_SHEETS.lineItems);
  }

  await workbook.xlsx.writeFile(options.filepath);

  const rowCount = ROWS_PER_SHEET * worksheets.length + worksheets.length;

  return { worksheets, rowCount };
}
