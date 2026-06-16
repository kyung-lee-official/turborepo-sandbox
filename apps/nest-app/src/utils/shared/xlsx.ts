import * as ExcelJS from "exceljs";

export type ImportValidationError = {
  rowNumber?: number;
  message: string;
  rawData: string;
};

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const buildValidationErrorsXlsxBuffer = async (
  errors: ImportValidationError[],
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Validation Errors");

  worksheet.columns = [
    { header: "Row Number", key: "rowNumber", width: 14 },
    { header: "Message", key: "message", width: 36 },
    { header: "Raw Data", key: "rawData", width: 60 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };

  for (const error of errors) {
    worksheet.addRow({
      rowNumber: error.rowNumber ?? "",
      message: error.message,
      rawData: error.rawData,
    });
  }

  worksheet.getColumn("rawData").alignment = { wrapText: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
