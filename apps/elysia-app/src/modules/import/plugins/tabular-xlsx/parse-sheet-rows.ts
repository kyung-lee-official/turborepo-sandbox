import type { Workbook, Worksheet } from "exceljs";
import { scopeTabularError } from "./scope-tabular-errors.ts";
import type {
  ParseSheetRowsHandlers,
  TabularParseContext,
  TabularSheetSpec,
} from "./tabular-processing.types.ts";

function validateWorksheetHeaders(
  expectedHeaders: readonly string[],
  actualHeaders: readonly string[],
): string[] {
  const messages: string[] = [];
  const maxLen = Math.max(expectedHeaders.length, actualHeaders.length);

  for (let index = 0; index < maxLen; index++) {
    const expected = expectedHeaders[index];
    const actual = actualHeaders[index] ?? "";
    if (expected === undefined) {
      messages.push(`Unexpected column ${index + 1}: "${actual}"`);
      continue;
    }
    if (actual !== expected) {
      messages.push(
        `Column ${index + 1} expected "${expected}" but got "${actual}"`,
      );
    }
  }

  return messages;
}

function rowCellsFromWorksheet(
  worksheet: Worksheet,
  headers: readonly string[],
): Array<{ rowNumber: number; cells: Record<string, string> }> {
  const rows: Array<{ rowNumber: number; cells: Record<string, string> }> = [];
  let rowIndex = 1;
  const iterator = worksheet.getRow(++rowIndex);
  while (iterator.hasValues) {
    const cells: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (header === undefined) continue;
      const cell = iterator.getCell(i + 1);
      const text = cell.text ?? "";
      cells[header] = text;
    }
    rows.push({ rowNumber: rowIndex, cells });
    rowIndex++;
    const next = worksheet.getRow(rowIndex + 1);
    if (!next.hasValues) break;
  }
  return rows;
}

export async function parseSheetRows(
  workbook: Workbook,
  spec: TabularSheetSpec,
  ctx: TabularParseContext,
  handlers: ParseSheetRowsHandlers,
): Promise<void> {
  const worksheet = workbook.getWorksheet(spec.sheetName);
  if (!worksheet) {
    handlers.pushError({
      message: `Worksheet not found: ${spec.sheetName}`,
    });
    return;
  }

  const headerRow = worksheet.getRow(1);
  const actualHeaders: string[] = [];
  for (let i = 1; i <= headerRow.cellCount; i++) {
    actualHeaders.push(headerRow.getCell(i).text ?? "");
  }

  const headerErrors = validateWorksheetHeaders(spec.headers, actualHeaders);
  if (headerErrors.length > 0) {
    handlers.pushError(
      scopeTabularError(
        { message: headerErrors.join("; "), worksheetName: spec.sheetName },
        {
          sourceId: ctx.sourceId,
          originalName: ctx.label,
          worksheetName: spec.sheetName,
        },
      ),
    );
    return;
  }

  const rows = rowCellsFromWorksheet(worksheet, spec.headers);

  for (const row of rows) {
    await handlers.onRow(row);
    if (handlers.onProgress) {
      await handlers.onProgress({
        processedCount: rows.indexOf(row) + 1,
        totalCount: rows.length,
        percent: Math.round(((rows.indexOf(row) + 1) / rows.length) * 100),
      });
    }
  }
}
