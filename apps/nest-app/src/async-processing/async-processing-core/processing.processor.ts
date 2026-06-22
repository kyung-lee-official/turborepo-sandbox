import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import {
  ASYNC_PROCESSING_QUEUE,
  type AsyncProcessingJobPayload,
  type DomainKindRegistration,
  type DomainRunResult,
  LEASE_REFRESH_INTERVAL_MS,
  type ProcessingJob,
  type ProcessingSource,
  type VerifiedProcessingSource,
} from "../async-processing.types";
import { DomainRegistry } from "./domain-registry.service";
import { ProcessingActiveJobLock } from "./processing-active-job.lock";
import { ProcessingErrorBlobStore } from "./processing-error-blob.store";
import { ProcessingJobRepository } from "./processing-job.repository";
import { ProcessingProgressPublisher } from "./processing-progress-publisher.service";
import { ProcessingSourceReader } from "./processing-source.reader";

@Injectable()
@Processor(ASYNC_PROCESSING_QUEUE)
export class ProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessingProcessor.name);
  private readonly lastLeaseRefreshAt = new Map<string, number>();

  constructor(
    private readonly jobRepository: ProcessingJobRepository,
    private readonly domainRegistry: DomainRegistry,
    private readonly sourceReader: ProcessingSourceReader,
    private readonly progressPublisher: ProcessingProgressPublisher,
    private readonly errorBlobStore: ProcessingErrorBlobStore,
    private readonly activeJobLock: ProcessingActiveJobLock,
  ) {
    super();
  }

  async process(job: Job<AsyncProcessingJobPayload>): Promise<void> {
    const { jobId, manifestId } = job.data;
    const verifiedForCleanup: VerifiedProcessingSource[] = [];
    let domainKind = job.data.domainKind;

    const existing = await this.jobRepository.findById(jobId);
    if (existing?.phase === "complete" || existing?.phase === "failed") {
      await this.releaseOrphanLockIfTerminal(jobId, existing);
      return;
    }

    const claimed = await this.jobRepository.claimProcessingPhase(jobId);
    if (!claimed) {
      const row = await this.jobRepository.findById(jobId);
      if (row) {
        await this.releaseOrphanLockIfTerminal(jobId, row);
      }
      return;
    }

    try {
      try {
        const jobRow = await this.jobRepository.findById(jobId);
        domainKind = jobRow!.domainKind;
        let registration = this.domainRegistry.getByDomainKind(domainKind);
        await this.refreshLeaseIfNeeded(registration, domainKind, jobId, true);

        const manifest =
          await this.jobRepository.getManifestByManifestId(manifestId);
        if (!manifest) {
          await this.markJobFailed(jobId);
          return;
        }

        domainKind = manifest.domainKind;
        registration = this.domainRegistry.getByDomainKind(domainKind);

        const verifiedSources = await this.buildVerifiedSources(
          manifest.sources,
          verifiedForCleanup,
        );

        await this.refreshLeaseIfNeeded(registration, domainKind, jobId, true);

        let result: DomainRunResult;
        try {
          result = await registration.domainRunner.run(jobId, verifiedSources, {
            openStream: (source) =>
              this.sourceReader.openReadStream(source.verifiedLocator),
            onProgress: async (detail) => {
              await this.progressPublisher.publishProgress(jobId, detail);
              await this.refreshLeaseIfNeeded(
                registration,
                domainKind,
                jobId,
                false,
              );
            },
          });
        } catch (domainError) {
          await this.markJobFailed(jobId);
          this.logger.error(`Domain run failed for job ${jobId}`, domainError);
          return;
        }

        try {
          await this.finalizeSuccess(jobId, result);
          await this.publishTerminalIfTerminal(jobId);
        } catch (postDomainError) {
          this.logger.error(
            `Post-domain finalize failed for job ${jobId}`,
            postDomainError,
          );
          try {
            await this.finalizeSuccess(jobId, result);
          } catch (retryError) {
            this.logger.error(
              `Post-domain retry failed for job ${jobId}`,
              retryError,
            );
          }
          await this.publishTerminalIfTerminal(jobId);
        }
      } catch (preDomainError) {
        const row = await this.jobRepository.findById(jobId);
        if (row?.phase === "processing") {
          await this.markJobFailed(jobId);
        }
        this.logger.error(
          `Pre-domain step failed for job ${jobId}`,
          preDomainError,
        );
      }
    } finally {
      const row = await this.jobRepository.findById(jobId);
      if (
        row &&
        (row.phase === "complete" || row.phase === "failed") &&
        (await this.activeJobLock.isHeldBy(jobId, row.domainKind))
      ) {
        await this.activeJobLock.release(row.domainKind, jobId);
      }
      for (const source of verifiedForCleanup) {
        try {
          await this.sourceReader.deleteLocator(source.verifiedLocator);
        } catch (cleanupError) {
          this.logger.warn(
            `deleteLocator failed for job ${jobId}`,
            cleanupError,
          );
        }
      }
    }
  }

  private async buildVerifiedSources(
    sources: Record<string, ProcessingSource>,
    verifiedForCleanup: VerifiedProcessingSource[],
  ): Promise<Map<string, VerifiedProcessingSource>> {
    const map = new Map<string, VerifiedProcessingSource>();
    for (const [sourceId, source] of Object.entries(sources)) {
      const verifiedLocator = await this.sourceReader.verifyLocator(
        source.locator,
      );
      const verified: VerifiedProcessingSource = {
        ...source,
        sourceId: source.sourceId ?? sourceId,
        verifiedLocator,
      };
      map.set(sourceId, verified);
      verifiedForCleanup.push(verified);
    }
    return map;
  }

  private async finalizeSuccess(
    jobId: string,
    result: DomainRunResult,
  ): Promise<void> {
    let errorStorageKey: string | undefined;
    if (result.outcome === "validation_failed" && result.errorBlob) {
      errorStorageKey = await this.errorBlobStore.putErrorBlob(
        jobId,
        result.errorBlob,
      );
    }

    await this.jobRepository.finalize(jobId, {
      phase: "complete",
      outcome: result.outcome,
      processedCount: result.processedCount,
      errorCount: result.errorCount,
      errorStorageKey,
      completedAt: new Date(),
    });
  }

  private async markJobFailed(jobId: string): Promise<void> {
    await this.jobRepository.finalize(jobId, {
      phase: "failed",
      outcome: "failed",
      completedAt: new Date(),
    });
    try {
      await this.progressPublisher.publishTerminal(jobId, { phase: "failed" });
    } catch {
      // best effort
    }
  }

  private async publishTerminalIfTerminal(jobId: string): Promise<void> {
    const row = await this.jobRepository.findById(jobId);
    if (!row || (row.phase !== "complete" && row.phase !== "failed")) {
      return;
    }
    await this.progressPublisher.publishTerminal(jobId, {
      phase: row.phase === "complete" ? "complete" : "failed",
    });
  }

  private async releaseOrphanLockIfTerminal(
    jobId: string,
    row: ProcessingJob,
  ): Promise<void> {
    if (
      (row.phase === "complete" || row.phase === "failed") &&
      (await this.activeJobLock.isHeldBy(jobId, row.domainKind))
    ) {
      await this.activeJobLock.release(row.domainKind, jobId);
    }
  }

  private async refreshLeaseIfNeeded(
    registration: DomainKindRegistration,
    domainKind: string,
    jobId: string,
    force: boolean,
  ): Promise<void> {
    if (registration.lockPolicy.type !== "global_singleton") {
      return;
    }
    const now = Date.now();
    const last = this.lastLeaseRefreshAt.get(jobId) ?? 0;
    if (force || now - last >= LEASE_REFRESH_INTERVAL_MS) {
      await this.activeJobLock.refreshLease(domainKind, jobId);
      this.lastLeaseRefreshAt.set(jobId, now);
    }
  }
}
