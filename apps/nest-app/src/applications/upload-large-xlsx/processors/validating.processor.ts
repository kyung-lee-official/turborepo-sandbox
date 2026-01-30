import { Injectable, Logger } from "@nestjs/common";
import type { Job } from "bull";
import type * as ExcelJS from "exceljs";
import {
  RedisProgressStatusSchema,
  UploadLargeXlsxRowDataSchema,
  type ValidationError,
} from "../types";
import type { UploadLargeXlsxGateway } from "../upload-large-xlsx.gateway";
import { excelHeadersSchema } from "./file-processing.processor";

@Injectable()
export class ValidatingProcessor {
  private readonly logger = new Logger(ValidatingProcessor.name);

  constructor(private readonly gateway: UploadLargeXlsxGateway) {}

  /*
   * Process worksheet rows, validate them and emit real-time progress updates
   * Emits progress for the VALIDATING phase only.
   */
  async process(
    worksheet: ExcelJS.Worksheet,
    columnMap: Record<string, number>,
    taskId: number,
    job: Job,
  ) {
    try {
      const validatedData: any[] = [];
      const errors: ValidationError[] = [];
      const totalRows = worksheet.rowCount - 1; /* Exclude header row */
      const BATCH_SIZE = 1000;
      let processedRows = 0;

      /* Process rows in batches */
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

        const rowData = {
          name: row.getCell(columnMap[excelHeadersSchema.enum.Name]).text,
          gender: row.getCell(columnMap[excelHeadersSchema.enum.Gender]).text,
          bioId: row.getCell(columnMap[excelHeadersSchema.enum["Bio-ID"]]).text,
        };

        /* Validate row data using Zod */
        const result = UploadLargeXlsxRowDataSchema.safeParse(rowData);

        if (result.success) {
          validatedData.push(result.data);
        } else {
          /* Collect validation errors */
          const errorMessages = result.error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`,
          );

          errors.push({
            rowNumber,
            errors: errorMessages,
            rowData,
          });
        }

        processedRows++;

        /* Update progress every batch */
        if (
          /* when to update progress */
          processedRows % BATCH_SIZE === 0 ||
          processedRows === totalRows
        ) {
          const validationProgress =
            (processedRows / totalRows) * 100; /* 0-100% for VALIDATING phase */
          const jobProgress =
            20 +
            (processedRows / totalRows) * 30; /* 20-50% range for overall job */
          job.progress(jobProgress);

          this.gateway.emitTaskProgress(taskId, {
            phase: RedisProgressStatusSchema.enum.VALIDATING,
            progress:
              validationProgress /* Send VALIDATING-specific progress (0-100%) */,
            totalRows,
            validatedRows: processedRows,
            errorRows: errors.length,
          });
        }
      }

      return { validatedData, errors, totalRows };
    } catch (error) {
      this.logger.error(
        `ValidatingProcessor failed for task ${taskId}:`,
        error,
      );
      throw error;
    }
  }
}
