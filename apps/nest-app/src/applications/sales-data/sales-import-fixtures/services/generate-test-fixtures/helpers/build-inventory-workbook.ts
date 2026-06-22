import * as ExcelJS from "exceljs";
import type { TestFixtureScenario } from "../../../dto/generate-test-fixtures.dto";
import { applyDefaultExportedSheetView } from "./apply-exported-sheet-view";
import {
  EXCEL_BATCH_SIZE,
  INVENTORY_HEADERS,
  INVENTORY_SHEET,
  PARTIAL_INVALID_RATE,
  ROWS_PER_SHEET,
} from "./sales-fixture.constants";
import { type SkuPool, skuFromPool } from "./sku-pool";

type BuildInventoryOptions = {
  filepath: string;
  scenario: TestFixtureScenario;
  pool: SkuPool;
};

function shouldInvalidate(scenario: TestFixtureScenario): boolean {
  return scenario === "partial" && Math.random() < PARTIAL_INVALID_RATE;
}

export async function buildInventoryWorkbook(
  options: BuildInventoryOptions,
): Promise<{ worksheets: string[]; rowCount: number }> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(INVENTORY_SHEET);
  worksheet.columns = INVENTORY_HEADERS.map((header) => ({
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
      const sku = skuFromPool(options.pool, i + 31);
      const invalidate =
        shouldInvalidate(options.scenario) ||
        (options.scenario === "partial" && i === 0);

      let rowSku = sku;
      let qty = (i % 10_000) + 1;

      if (invalidate) {
        if (i % 2 === 0) {
          qty = -qty;
        } else {
          rowSku = "";
        }
      }

      batch.push({
        SKU: rowSku,
        "Inventory Qty": qty,
      });
    }

    worksheet.addRows(batch);
  }

  applyDefaultExportedSheetView(worksheet, INVENTORY_HEADERS.length);
  await workbook.xlsx.writeFile(options.filepath);

  return {
    worksheets: [INVENTORY_SHEET],
    rowCount: ROWS_PER_SHEET + 1,
  };
}
