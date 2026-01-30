import { BadRequestException, Injectable } from "@nestjs/common";
import type { UploadLargeXlsxTask } from "@repo/database";
import * as ExcelJS from "exceljs";
import type { Response } from "express";
import type { PrismaService } from "../../recipes/prisma/prisma.service";
import type { BullQueueService } from "./services/bull-queue.service";
import type { RedisStorageService } from "./services/redis-storage.service";
import {
  ActiveStatusesSchema,
  type ProcessFileJobData,
  ProcessFileJobDataSchema,
  TerminalStatusesSchema,
} from "./types";

@Injectable()
export class UploadLargeXlsxService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly bullQueueService: BullQueueService,
    private readonly redisStorageService: RedisStorageService,
  ) {}

  async uploadXlsx(file: Express.Multer.File, response: Response) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    if (
      !file.mimetype.includes("spreadsheet") &&
      !file.originalname.endsWith(".xlsx")
    ) {
      throw new BadRequestException("File must be an XLSX file");
    }

    /* Create a new task with pending status */
    const task = await this.prismaService.client.uploadLargeXlsxTask.create({
      data: {
        status: ActiveStatusesSchema.enum.PENDING,
        totalRows: 0 /* Will be updated after processing */,
      },
    });

    /* Store file temporarily in Redis */
    const fileKey = await this.redisStorageService.storeFile(
      task.id,
      file.buffer,
    );

    /* Create job data and validate it */
    const jobData: ProcessFileJobData = {
      taskId: task.id,
      fileKey,
      fileName: file.originalname,
    };

    /* Validate job data with Zod */
    const validatedJobData = ProcessFileJobDataSchema.parse(jobData);

    /* Return immediately with task info */
    response.status(200).json({
      success: true,
      taskId: task.id,
      message: "Upload finished, starting validation",
    });

    /* Queue file processing job asynchronously (don't await) */
    setImmediate(async () => {
      try {
        await this.bullQueueService.addFileProcessingJob(validatedJobData);
      } catch (error) {
        /* If job queuing fails, update task status and clean up */
        await this.prismaService.client.uploadLargeXlsxTask.update({
          where: { id: task.id },
          data: { status: TerminalStatusesSchema.enum.FAILED as any },
        });
        await this.redisStorageService.deleteFile(fileKey);
      }
    });
  }

  async getTasks(page: number = 1) {
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const tasks = await this.prismaService.client.uploadLargeXlsxTask.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });
    return tasks;
  }

  async getTaskById(taskId: number): Promise<UploadLargeXlsxTask | null> {
    const task = await this.prismaService.client.uploadLargeXlsxTask.findUnique(
      {
        where: { id: taskId },
        include: {
          data: true,
          errors: true,
          _count: {
            select: {
              data: true,
              errors: true,
            },
          },
        },
      },
    );
    return task;
  }

  async deleteDataByTaskId(taskId: number) {
    /* Delete all data entries for this task */
    const deletedData =
      await this.prismaService.client.uploadLargeXlsxData.deleteMany({
        where: { taskId },
      });

    /* Delete all error entries for this task */
    const deletedErrors =
      await this.prismaService.client.uploadLargeXlsxError.deleteMany({
        where: { taskId },
      });

    /* Delete the task itself */
    await this.prismaService.client.uploadLargeXlsxTask.delete({
      where: { id: taskId },
    });

    return {
      success: true,
      deletedRecords: deletedData.count,
      deletedErrors: deletedErrors.count,
      message: `Task ${taskId} deleted successfully with ${deletedData.count} records and ${deletedErrors.count} errors`,
    };
  }

  async getValidationErrorsByTaskId(
    taskId: number,
    response: Response,
  ): Promise<void> {
    try {
      /* First, check if task exists */
      const task =
        await this.prismaService.client.uploadLargeXlsxTask.findUnique({
          where: { id: taskId },
        });

      if (!task) {
        throw new BadRequestException(`Task with ID ${taskId} not found`);
      }

      /* Get all validation errors for this task */
      const errors =
        await this.prismaService.client.uploadLargeXlsxError.findMany({
          where: { taskId },
          orderBy: { rowNumber: "asc" },
        });

      if (errors.length === 0) {
        throw new BadRequestException(
          `No validation errors found for task ${taskId}`,
        );
      }

      /* Create a new workbook */
      const workbook = new ExcelJS.Workbook();
      const worksheet =
        workbook.addWorksheet("Validation Errors"); /* Add headers */
      worksheet.addRow([
        "Row Number",
        "Name",
        "Gender",
        "Bio-ID",
        "Error Messages",
      ]);

      /* Style headers */
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      /* Add error data */
      errors.forEach((error) => {
        const rowData = error.rowData as any;
        worksheet.addRow([
          error.rowNumber,
          rowData?.name || "",
          rowData?.gender || "",
          rowData?.bioId || "",
          error.errors.join("; "),
        ]);
      });

      /* Auto-fit columns */
      worksheet.columns.forEach((column) => {
        column.width = 20;
      });

      /* Generate buffer and send response */
      const buffer = await workbook.xlsx.writeBuffer();

      response.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="validation-errors-task-${taskId}.xlsx"`,
      );

      response.send(Buffer.from(buffer));
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate validation errors file: ${(error as Error).message}`,
      );
    }
  }
}
