import * as ExcelJS from "exceljs";
import { applyDefaultExportedSheetView } from "./apply-exported-sheet-view";
import type { ErrorDetail } from "./tabular-processing.types";

export const TABULAR_ERROR_XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type ErrorColumnDef = {
  header: string;
  key: keyof ErrorDetail | "rowNumberDisplay";
  width: number;
};

function pickErrorColumns(errors: readonly ErrorDetail[]): ErrorColumnDef[] {
  const columns: ErrorColumnDef[] = [];

  if (errors.some((error) => error.sourceId)) {
    columns.push({ header: "Source", key: "sourceId", width: 20 });
  }
  if (errors.some((error) => error.originalName)) {
    columns.push({ header: "Original Name", key: "originalName", width: 28 });
  }
  if (errors.some((error) => error.worksheetName)) {
    columns.push({ header: "Worksheet", key: "worksheetName", width: 24 });
  }

  columns.push(
    { header: "Row Number", key: "rowNumberDisplay", width: 14 },
    { header: "Message", key: "message", width: 36 },
    { header: "Raw Data", key: "rawData", width: 60 },
  );

  return columns;
}

function rowFromError(
  error: ErrorDetail,
  columns: ErrorColumnDef[],
): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  for (const column of columns) {
    switch (column.key) {
      case "rowNumberDisplay":
        row[column.key] = error.rowNumber ?? "";
        break;
      case "sourceId":
        row[column.key] = error.sourceId ?? "";
        break;
      case "originalName":
        row[column.key] = error.originalName ?? "";
        break;
      case "worksheetName":
        row[column.key] = error.worksheetName ?? "";
        break;
      case "message":
        row[column.key] = error.message;
        break;
      case "rawData":
        row[column.key] = error.rawData ?? "";
        break;
    }
  }
  return row;
}

export async function buildTabularErrorXlsxBuffer(
  errors: readonly ErrorDetail[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Validation Errors");
  const columns = pickErrorColumns(errors);

  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };

  for (const error of errors) {
    worksheet.addRow(rowFromError(error, columns));
  }

  const rawDataColumn = worksheet.getColumn("rawData");
  if (rawDataColumn) {
    rawDataColumn.alignment = { wrapText: true };
  }

  applyDefaultExportedSheetView(worksheet, columns.length);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
