import type { Worksheet } from "exceljs";

export function applyDefaultExportedSheetView(
  worksheet: Worksheet,
  columnCount?: number,
) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  const cols = columnCount ?? worksheet.columnCount;
  if (cols > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: cols },
    };
  }
}
