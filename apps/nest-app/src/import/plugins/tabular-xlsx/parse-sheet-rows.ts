import type { Row, Workbook, Worksheet } from "exceljs";
import { scopeTabularError } from "./scope-tabular-errors";
import type {
  ParseSheetRowsHandlers,
  TabularParseContext,
  TabularSheetSpec,
} from "./tabular-processing.types";

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

function readHeaderTextsFromRow(
  worksheet: Worksheet,
  columnCount: number,
): string[] {
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  for (let col = 1; col <= columnCount; col++) {
    headers.push(headerRow.getCell(col).text?.trim() ?? "");
  }
  return headers;
}

function countNonBlankDataRows(
  worksheet: Worksheet,
  headers: readonly string[],
): number {
  let count = 0;
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    if (rowHasContent(worksheet.getRow(rowNumber), headers)) {
      count++;
    }
  }
  return count;
}

function rowHasContent(row: Row, headers: readonly string[]): boolean {
  for (let index = 0; index < headers.length; index++) {
    if (row.getCell(index + 1).text?.trim()) {
      return true;
    }
  }
  return false;
}

function readCellsFromRowByHeaders(
  row: Row,
  headers: readonly string[],
): Record<string, string> {
  const cells: Record<string, string> = {};
  for (let index = 0; index < headers.length; index++) {
    const header = headers[index];
    cells[header] = row.getCell(index + 1).text?.trim() ?? "";
  }
  return cells;
}

export async function parseSheetRows(
  workbook: Workbook,
  spec: TabularSheetSpec,
  ctx: TabularParseContext,
  handlers: ParseSheetRowsHandlers,
): Promise<void> {
  const scope = {
    sourceId: ctx.sourceId,
    originalName: ctx.label,
    worksheetName: spec.sheetName,
  };

  const worksheet = workbook.getWorksheet(spec.sheetName);
  if (!worksheet) {
    handlers.pushError(
      scopeTabularError(
        { message: `Worksheet not found: ${spec.sheetName}` },
        scope,
      ),
    );
    return;
  }

  const actualHeaders = readHeaderTextsFromRow(worksheet, spec.headers.length);
  const headerMessages = validateWorksheetHeaders(spec.headers, actualHeaders);
  for (const message of headerMessages) {
    handlers.pushError(scopeTabularError({ message }, scope));
  }
  if (headerMessages.length > 0) {
    return;
  }

  const totalDataRows = countNonBlankDataRows(worksheet, spec.headers);
  let processedDataRows = 0;

  if (handlers.onProgress && totalDataRows > 0) {
    await handlers.onProgress({
      processedCount: 0,
      totalCount: totalDataRows,
      percent: 0,
    });
  }

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!rowHasContent(row, spec.headers)) {
      continue;
    }

    const cells = readCellsFromRowByHeaders(row, spec.headers);
    await handlers.onRow({ rowNumber, cells });
    processedDataRows++;

    if (handlers.onProgress && totalDataRows > 0) {
      const percent = Math.round((processedDataRows / totalDataRows) * 100);
      await handlers.onProgress({
        processedCount: processedDataRows,
        totalCount: totalDataRows,
        percent,
      });
    }
  }
}
