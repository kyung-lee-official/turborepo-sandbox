import {
  Controller,
  Get,
  MessageEvent,
  NotFoundException,
  Param,
  Query,
  Sse,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { listProcessingJobsQuerySchema } from "./list-processing-jobs.schema";
import { ProcessingJobRepository } from "./processing-job.repository";
import { ProcessingJobErrorRepository } from "./processing-job-error.repository";
import { mapProcessingJobToResponse } from "./processing-job-response.mapper";
import { ProcessingProgressSseService } from "./processing-progress-sse.service";

@Controller("jobs")
export class ProcessingController {
  constructor(
    private readonly jobRepository: ProcessingJobRepository,
    private readonly progressSseService: ProcessingProgressSseService,
    private readonly jobErrorRepository: ProcessingJobErrorRepository,
  ) {}

  @Get()
  async listJobs(@Query() query: unknown) {
    const parsed = listProcessingJobsQuerySchema.parse(query ?? {});
    const { jobs, nextCursor } = await this.jobRepository.findMany({
      phases: parsed.phase,
      domainKind: parsed.domainKind,
      limit: parsed.limit,
      cursor: parsed.cursor,
    });

    return {
      jobs: jobs.map(mapProcessingJobToResponse),
      nextCursor,
    };
  }

  @Get(":jobId")
  async getJob(@Param("jobId") jobId: string) {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Processing job not found: ${jobId}`);
    }

    return mapProcessingJobToResponse(job);
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
