import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import { nanoid } from "nanoid";
import {
  ASYNC_IMPORT_QUEUE,
  type ImportUpload,
  type JobMeta,
} from "./async-import.types";
import { ImportJobStoreService } from "./import-job-store.service";
import { assertImportLockAllowsEnqueue } from "./import-lock-policy";
import { ImportRegistry } from "./import-registry";

@Injectable()
export class ImportTransportService {
  private readonly logger = new Logger(ImportTransportService.name);

  constructor(
    private readonly importRegistry: ImportRegistry,
    private readonly jobStore: ImportJobStoreService,
    @InjectQueue(ASYNC_IMPORT_QUEUE)
    private readonly asyncImportQueue: Queue,
  ) {}

  async startImport(
    importKind: string,
    filesByField: Record<string, Express.Multer.File[]>,
  ): Promise<{ jobId: string }> {
    const registration = this.importRegistry.getByImportKind(importKind);

    await assertImportLockAllowsEnqueue(
      importKind,
      registration.lockPolicy,
      this.jobStore,
    );

    const uploads = this.buildUploadsFromMultipart(
      registration.uploadSlots,
      filesByField,
    );

    const jobId = nanoid();
    const now = new Date().toISOString();
    const meta: JobMeta = {
      jobId,
      importKind,
      phase: "queued",
      createdAt: now,
      updatedAt: now,
    };

    for (const upload of uploads.values()) {
      await this.jobStore.saveUpload(jobId, upload);
    }
    await this.jobStore.saveMeta(meta);

    if (registration.lockPolicy.type === "global_singleton") {
      await this.jobStore.setActiveJobIdByImportKind(importKind, jobId);
    }

    await this.asyncImportQueue.add(
      "async-import-job",
      { jobId, importKind },
      {
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 3600 },
      },
    );

    this.logger.log(`Enqueued async import job ${jobId} (${importKind})`);
    return { jobId };
  }

  async getJobMetaByJobId(jobId: string): Promise<JobMeta> {
    const meta = await this.jobStore.getMetaByJobId(jobId);
    if (!meta) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    return meta;
  }

  async getErrorBlobByJobId(jobId: string): Promise<Buffer> {
    const meta = await this.getJobMetaByJobId(jobId);
    if (meta.outcome !== "validation_failed") {
      throw new BadRequestException(
        `Job ${jobId} does not have a validation error blob`,
      );
    }
    const blob = await this.jobStore.getErrorBlobByJobId(jobId);
    if (!blob) {
      throw new NotFoundException(`Error blob for job ${jobId} not found`);
    }
    return blob;
  }

  private buildUploadsFromMultipart(
    uploadSlots: readonly { uploadSlotId: string; required: boolean }[],
    filesByField: Record<string, Express.Multer.File[]>,
  ): Map<string, ImportUpload> {
    const uploads = new Map<string, ImportUpload>();

    for (const slot of uploadSlots) {
      const files = filesByField[slot.uploadSlotId] ?? [];
      if (slot.required && files.length === 0) {
        throw new BadRequestException(
          `Missing required upload slot ${slot.uploadSlotId}`,
        );
      }
      if (files.length > 1) {
        throw new BadRequestException(
          `Upload slot ${slot.uploadSlotId} accepts one file`,
        );
      }
      const file = files[0];
      if (!file) {
        continue;
      }
      uploads.set(slot.uploadSlotId, {
        uploadSlotId: slot.uploadSlotId,
        originalName: file.originalname,
        buffer: file.buffer,
        mimeType: file.mimetype,
      });
    }

    return uploads;
  }
}
