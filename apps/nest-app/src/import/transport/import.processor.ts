import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import {
  ASYNC_IMPORT_QUEUE,
  type AsyncImportJobPayload,
  type DomainImportResult,
  type ImportKindRegistration,
} from "./async-import.types";
import { ImportJobStoreService } from "./import-job-store.service";
import { ImportRegistry } from "./import-registry";

@Injectable()
@Processor(ASYNC_IMPORT_QUEUE)
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(
    private readonly importRegistry: ImportRegistry,
    private readonly jobStore: ImportJobStoreService,
  ) {
    super();
  }

  async process(job: Job<AsyncImportJobPayload>) {
    const { jobId, importKind } = job.data;
    const registration = this.importRegistry.getByImportKind(importKind);
    const uploadSlotIds = registration.uploadSlots.map(
      (slot) => slot.uploadSlotId,
    );

    await this.jobStore.patchMetaByJobId(jobId, { phase: "processing" });

    try {
      const uploads = await this.jobStore.loadUploadsByJobId(
        jobId,
        uploadSlotIds,
      );
      const result = await registration.domainRunner.run(uploads, {
        onProgress: async (detail) => {
          await this.jobStore.patchMetaByJobId(jobId, {
            phase: "processing",
            progress: detail,
          });
        },
      });

      await this.finalizeSuccess(jobId, importKind, registration, result);
    } catch (error) {
      await this.finalizeFailure(jobId, importKind, registration, error);
      throw error;
    }
  }

  private async finalizeSuccess(
    jobId: string,
    importKind: string,
    registration: ImportKindRegistration,
    result: DomainImportResult,
  ) {
    const uploadSlotIds = registration.uploadSlots.map(
      (slot) => slot.uploadSlotId,
    );

    if (result.outcome === "validation_failed") {
      if (result.errorBlob) {
        await this.jobStore.saveErrorBlobByJobId(jobId, result.errorBlob);
      }
      await this.jobStore.patchMetaByJobId(jobId, {
        phase: "complete",
        outcome: "validation_failed",
        importedCount: result.importedCount,
        errorCount: result.errorCount,
        errorBlobKey: result.errorBlob ? jobId : undefined,
      });
    } else {
      await this.jobStore.patchMetaByJobId(jobId, {
        phase: "complete",
        outcome: "success",
        importedCount: result.importedCount,
        errorCount: 0,
      });
    }

    await this.jobStore.clearUploadsByJobId(jobId, uploadSlotIds);
    await this.clearActiveJobIfNeeded(jobId, importKind, registration);
    this.logger.log(`Completed async import job ${jobId} (${importKind})`);
  }

  private async finalizeFailure(
    jobId: string,
    importKind: string,
    registration: ImportKindRegistration,
    error: unknown,
  ) {
    const uploadSlotIds = registration.uploadSlots.map(
      (slot) => slot.uploadSlotId,
    );
    await this.jobStore.patchMetaByJobId(jobId, {
      phase: "failed",
      progress: {
        message: error instanceof Error ? error.message : "Import failed",
      },
    });
    await this.jobStore.clearUploadsByJobId(jobId, uploadSlotIds);
    await this.clearActiveJobIfNeeded(jobId, importKind, registration);
    this.logger.error(`Failed async import job ${jobId} (${importKind})`, error);
  }

  private async clearActiveJobIfNeeded(
    jobId: string,
    importKind: string,
    registration: ImportKindRegistration,
  ) {
    if (registration.lockPolicy.type === "global_singleton") {
      await this.jobStore.clearActiveJobIdByImportKind(importKind, jobId);
    }
  }
}
