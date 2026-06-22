import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { ProcessingJobRepository } from "./processing-job.repository";
import { ProcessingProgressSseService } from "./processing-progress-sse.service";

@Controller("jobs")
export class ProcessingController {
  constructor(
    private readonly jobRepository: ProcessingJobRepository,
    private readonly progressSseService: ProcessingProgressSseService,
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
      errorStorageKey: job.errorStorageKey,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }

  @Get(":jobId/events")
  async streamEvents(@Param("jobId") jobId: string, @Res() res: Response) {
    const stream = await this.progressSseService.streamJobEvents(jobId);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    stream.pipe(res);
  }
}
