import { BadRequestException, Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import type { Response } from "express";
import {
  buildValidationErrorsXlsxBuffer,
  type ImportValidationError,
  XLSX_CONTENT_TYPE,
} from "../../utils/shared/xlsx";

type ImportedPerson = {
  rowNumber: number;
  name: string;
  email: string;
  department: string;
};

@Injectable()
export class Import207ErrorXlsxService {
  private readonly importedRows: ImportedPerson[] = [];

  async importPeople(file: Express.Multer.File, response: Response) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    if (
      !file.mimetype.includes("spreadsheet") &&
      !file.originalname.endsWith(".xlsx")
    ) {
      throw new BadRequestException("File must be an XLSX file");
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as unknown as ArrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException("Workbook does not contain a worksheet");
    }

    const errors: ImportValidationError[] = [];
    const acceptedRows: ImportedPerson[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      const rawRow = {
        name: row.getCell(1).text.trim(),
        email: row.getCell(2).text.trim(),
        department: row.getCell(3).text.trim(),
      };

      const message = this.validateRow(rawRow);
      if (message) {
        errors.push({
          rowNumber,
          message,
          rawData: JSON.stringify(rawRow),
        });
        return;
      }

      const acceptedRow = {
        rowNumber,
        name: rawRow.name,
        email: rawRow.email,
        department: rawRow.department,
      };

      this.importedRows.push(acceptedRow);
      acceptedRows.push(acceptedRow);
    });

    if (errors.length > 0) {
      const buffer = await buildValidationErrorsXlsxBuffer(errors);
      response.setHeader("Content-Type", XLSX_CONTENT_TYPE);
      response.setHeader(
        "Content-Disposition",
        'attachment; filename="people-import-errors.xlsx"',
      );
      response.setHeader("X-Error-Message", "Some rows failed validation");
      response.setHeader("X-Error-Code", "IMPORT_PARTIAL_SUCCESS");
      response.status(207).send(buffer);
      return;
    }

    response.status(200).json({
      success: true,
      importedCount: acceptedRows.length,
      rows: acceptedRows,
    });
  }

  listImportedRows() {
    return {
      count: this.importedRows.length,
      rows: this.importedRows,
    };
  }

  async buildSampleWorkbook(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("People");

    worksheet.columns = [
      { header: "Name", key: "name", width: 24 },
      { header: "Email", key: "email", width: 32 },
      { header: "Department", key: "department", width: 24 },
    ];

    worksheet.addRows([
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        department: "Engineering",
      },
      {
        name: "",
        email: "missing-name@example.com",
        department: "Operations",
      },
      {
        name: "Grace Hopper",
        email: "not-an-email",
        department: "Research",
      },
      {
        name: "Katherine Johnson",
        email: "katherine@example.com",
        department: "Analytics",
      },
    ]);

    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private validateRow(row: {
    name: string;
    email: string;
    department: string;
  }): string | null {
    const messages: string[] = [];

    if (!row.name) {
      messages.push("Name is required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      messages.push("Email must be valid");
    }
    if (!row.department) {
      messages.push("Department is required");
    }

    return messages.length > 0 ? messages.join("; ") : null;
  }
}
