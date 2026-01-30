import { Injectable, Logger } from "@nestjs/common";
import type { Job } from "bull";
import * as ExcelJS from "exceljs";
import type { PrismaService } from "../../../recipes/prisma/prisma.service";
import type { RedisStorageService } from "../services/redis-storage.service";
import {
  ActiveStatusesSchema,
  type ProcessFileJobData,
  ProcessFileJobDataSchema,
  RedisProgressStatusSchema,
  type Task,
  TerminalStatusesSchema,
  type ValidationError,
} from "../types";
import type { UploadLargeXlsxGateway } from "../upload-large-xlsx.gateway";
import type { SavingProcessor } from "./saving.processor";
import type { ValidatingProcessor } from "./validating.processor";

import dayjs = require("dayjs");

import { validateWorksheetHeaders } from "exceljs-ext";
import z from "zod";

/* Zod schema for Excel header validation */
export const excelHeadersSchema = z.enum(["Name", "Gender", "Bio-ID"]);
export type ExcelHeaders = z.infer<typeof excelHeadersSchema>;

@Injectable()
export class FileProcessingProcessor {
  private readonly logger = new Logger(FileProcessingProcessor.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly gateway: UploadLargeXlsxGateway,
    private readonly redisStorageService: RedisStorageService,
    private readonly validatingProcessor: ValidatingProcessor,
    private readonly savingProcessor: SavingProcessor,
  ) {}

  /* Main processing method called by Bull */
  async process(job: Job<ProcessFileJobData>): Promise<Task> {
    /* Validate job data */
    const validatedData = ProcessFileJobDataSchema.parse(job.data);
    const { taskId, fileKey } = validatedData;

    try {
      /* Update task status to processing */
      await this.updateTaskStatus(taskId, ActiveStatusesSchema.enum.PROCESSING);

      /* Phase 1: Load workbook from Redis */
      /* Emit LOADING_WORKBOOK status without specific progress percentage */
      this.gateway.emitTaskProgress(taskId, {
        phase: RedisProgressStatusSchema.enum.LOADING_WORKBOOK,
      });

      const fileBuffer = await this.redisStorageService.getFile(fileKey);
      if (!fileBuffer) {
        throw new Error(`File not found in Redis for key: ${fileKey}`);
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new Error("No worksheet found in Excel file");
      }

      /* Phase 2: Validate headers */
      /* Emit VALIDATING_HEADERS status without specific progress percentage */
      this.gateway.emitTaskProgress(taskId, {
        phase: RedisProgressStatusSchema.enum.VALIDATING_HEADERS,
      });

      const columnMap = validateWorksheetHeaders(
        worksheet,
        excelHeadersSchema.options,
      );
      /* Phase 3: Extract and validate data */
      /* Delegate to ValidatingProcessor which WILL emit real-time progress */
      const { validatedData, errors, totalRows } =
        await this.validatingProcessor.process(
          worksheet,
          columnMap,
          taskId,
          job,
        );

      /* Update database with total rows */
      await this.prismaService.client.uploadLargeXlsxTask.update({
        where: { id: taskId },
        data: { totalRows },
      });

      /* Phase 4: Save valid data - delegate to SavingProcessor which WILL emit progress */
      const savedRows = await this.savingProcessor.process(
        validatedData,
        taskId,
        job,
      );

      /* Save validation errors if any */
      /**
       * TODO: Consider batching if errors array is too large
       */
      if (errors.length > 0) {
        await this.saveValidationErrors(errors, taskId);
      }

      /* Determine final status */
      const finalStatus =
        errors.length > 0
          ? TerminalStatusesSchema.enum.HAS_ERRORS
          : TerminalStatusesSchema.enum.COMPLETED;

      /* Update final task status and counts */
      const updatedData =
        await this.prismaService.client.uploadLargeXlsxTask.update({
          where: { id: taskId },
          data: {
            status: finalStatus,
            totalRows: totalRows,
            validatedRows: validatedData.length,
            errorRows: errors.length,
            savedRows: savedRows,
          },
        });
      const finalData: Task = {
        ...updatedData,
        createdAt: dayjs(updatedData.createdAt).toISOString(),
        updatedAt: dayjs(updatedData.updatedAt).toISOString(),
      };

      /* Clean up Redis file */
      await this.redisStorageService.deleteFile(fileKey);

      /* Emit completion event */
      this.gateway.emitTaskCompleted(taskId, finalData);
      return finalData;
    } catch (error) {
      this.logger.error(`Task ${taskId} failed:`, error);

      /* Update task status to failed */
      await this.updateTaskStatus(taskId, TerminalStatusesSchema.enum.FAILED);

      /* Clean up Redis file on failure */
      await this.redisStorageService.deleteFile(fileKey);

      /* Emit failure event */
      this.gateway.emitTaskFailed(taskId, (error as Error).message);

      throw error;
    }
  }

  /* Save validation errors to database */
  private async saveValidationErrors(
    errors: ValidationError[],
    taskId: number,
  ): Promise<void> {
    if (errors.length === 0) return;

    await this.prismaService.client.uploadLargeXlsxError.createMany({
      data: errors.map((error) => ({
        taskId,
        rowNumber: error.rowNumber,
        errors: error.errors,
        rowData: error.rowData,
      })),
    });
  }

  /* Update task status in database */
  private async updateTaskStatus(
    taskId: number,
    status: string,
  ): Promise<void> {
    await this.prismaService.client.uploadLargeXlsxTask.update({
      where: { id: taskId },
      data: { status: status as any },
    });
  }
}
