import { Injectable, Logger } from "@nestjs/common";
import type { Job } from "bull";
import type { PrismaService } from "../../../recipes/prisma/prisma.service";
import { RedisProgressStatusSchema } from "../types";
import type { UploadLargeXlsxGateway } from "../upload-large-xlsx.gateway";

@Injectable()
export class SavingProcessor {
  private readonly logger = new Logger(SavingProcessor.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly gateway: UploadLargeXlsxGateway,
  ) {}

  /*
   * Save valid data to database in batches and emit real-time progress
   * Emits progress for the SAVING phase only.
   */
  async process(validData: any[], taskId: number, job: Job): Promise<number> {
    try {
      if (validData.length === 0) {
        return 0;
      }

      const BATCH_SIZE = 1000;
      let savedRows = 0;

      /* Save data in batches */
      for (let i = 0; i < validData.length; i += BATCH_SIZE) {
        const batch = validData.slice(i, i + BATCH_SIZE);

        /* Insert batch to database */
        await this.prismaService.client.uploadLargeXlsxData.createMany({
          data: batch.map((row) => ({
            taskId,
            name: row.name,
            gender: row.gender,
            bioId: row.bioId,
          })),
        });

        savedRows += batch.length;

        /* Update progress */
        const savingProgress =
          (savedRows / validData.length) * 100; /* 0-100% for SAVING phase */
        const jobProgress =
          50 +
          (savedRows / validData.length) *
            50; /* 50-100% range for overall job */
        job.progress(jobProgress);

        this.gateway.emitTaskProgress(taskId, {
          phase: RedisProgressStatusSchema.enum.SAVING,
          progress: savingProgress /* Send SAVING-specific progress (0-100%) */,
          savedRows,
        });

        /**
         * Update job heartbeat to prevent timeout (stalled job)
         * this is crucial for long-running save operations,
         */
        job.update({ heartbeat: Date.now() });
      }

      return savedRows;
    } catch (error) {
      this.logger.error(`SavingProcessor failed for task ${taskId}:`, error);
      throw error;
    }
  }
}
