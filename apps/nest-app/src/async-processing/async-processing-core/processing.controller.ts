import {
  Controller,
  Get,
  MessageEvent,
  NotFoundException,
  Param,
  Sse,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { ProcessingJobRepository } from "./processing-job.repository";
import { ProcessingJobErrorRepository } from "./processing-job-error.repository";
import { ProcessingProgressSseService } from "./processing-progress-sse.service";

@Controller("jobs")
export class ProcessingController {
  constructor(
    private readonly jobRepository: ProcessingJobRepository,
    private readonly progressSseService: ProcessingProgressSseService,
    private readonly jobErrorRepository: ProcessingJobErrorRepository,
  ) {}

  @Get(":jobId")
  async getJob(@Param("jobId") jobId: string) {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Processing job not found: ${jobId}`);
    }

    return {
      jobId: job.id,
      domainKind: job.domainKind,
      phase: job.phase,
      outcome: job.outcome,
      processedCount: job.processedCount,
      errorCount: job.errorCount,
      hasErrors: (job.errorCount ?? 0) > 0,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }

  @Get(":jobId/errors")
  async getErrors(@Param("jobId") jobId: string) {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Processing job not found: ${jobId}`);
    }

    if (job.outcome !== "validation_failed" || (job.errorCount ?? 0) === 0) {
      throw new NotFoundException(`No error report for job: ${jobId}`);
    }

    const errors = await this.jobErrorRepository.listPayloadsByJobId(jobId);
    if (errors.length === 0) {
      throw new NotFoundException(`No error report for job: ${jobId}`);
    }

    return {
      jobId: job.id,
      domainKind: job.domainKind,
      errorCount: job.errorCount,
      errors,
    };
  }

  @Sse(":jobId/events")
  streamEvents(@Param("jobId") jobId: string): Observable<MessageEvent> {
    return this.progressSseService.streamJobEvents(jobId);
  }
}
