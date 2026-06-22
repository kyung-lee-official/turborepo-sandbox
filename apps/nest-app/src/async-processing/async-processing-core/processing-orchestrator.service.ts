import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import { nanoid } from "nanoid";
import {
  ASYNC_PROCESSING_QUEUE,
  type AsyncProcessingJobPayload,
  type ProcessingSource,
  type SourceSpec,
  type StartProcessingInput,
} from "../async-processing.types";
import { DomainRegistry } from "./domain-registry.service";
import { ProcessingActiveJobLock } from "./processing-active-job.lock";
import { ProcessingJobRepository } from "./processing-job.repository";

@Injectable()
export class ProcessingOrchestratorService {
  constructor(
    private readonly domainRegistry: DomainRegistry,
    private readonly jobRepository: ProcessingJobRepository,
    private readonly activeJobLock: ProcessingActiveJobLock,
    @InjectQueue(ASYNC_PROCESSING_QUEUE)
    private readonly asyncProcessingQueue: Queue<AsyncProcessingJobPayload>,
  ) {}

  async startProcessing(
    input: StartProcessingInput,
  ): Promise<{ jobId: string; manifestId: string }> {
    const registration = this.domainRegistry.getByDomainKind(input.domainKind);
    this.validateSources(input.sources, registration.sourceSpecs);

    const jobId = nanoid();
    const manifestId = nanoid();

    await this.jobRepository.createQueued({
      jobId,
      domainKind: input.domainKind,
      manifestId,
      sources: input.sources,
    });

    let lockAcquired = false;

    try {
      if (registration.lockPolicy.type === "global_singleton") {
        await this.activeJobLock.acquire(input.domainKind, jobId);
        lockAcquired = true;
      }

      await this.asyncProcessingQueue.add(
        "async-processing-job",
        { jobId, domainKind: input.domainKind, manifestId },
        {
          attempts: 1,
          removeOnComplete: { age: 3600 },
          removeOnFail: { age: 3600 },
        },
      );
    } catch (error) {
      if (lockAcquired) {
        await this.activeJobLock.release(input.domainKind, jobId);
      }
      await this.jobRepository.deleteById(jobId);
      throw error;
    }

    return { jobId, manifestId };
  }

  private validateSources(
    sources: Record<string, ProcessingSource>,
    sourceSpecs: SourceSpec[],
  ): void {
    for (const spec of sourceSpecs) {
      if (!spec.required) {
        continue;
      }
      const entry = sources[spec.sourceId];
      if (!entry) {
        throw new BadRequestException(
          `Missing required sourceId: ${spec.sourceId}`,
        );
      }
      if (entry.sourceId !== spec.sourceId) {
        throw new BadRequestException(
          `Source key ${spec.sourceId} must match entry.sourceId ${entry.sourceId}`,
        );
      }
    }
  }
}
