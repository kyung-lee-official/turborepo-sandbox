import { Injectable } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";
import type {
  ProcessingProgressEvent,
  ProcessingTerminalEvent,
} from "./async-processing.types";

@Injectable()
export class ProcessingProgressPublisher {
  constructor(private readonly redisService: RedisService) {}

  async publishProgress(jobId: string, progress: unknown): Promise<void> {
    const event: ProcessingProgressEvent = { jobId, progress };
    await this.redisService
      .getClient()
      .publish(`async-processing:progress:${jobId}`, JSON.stringify(event));
  }

  async publishTerminal(
    jobId: string,
    event: Pick<ProcessingTerminalEvent, "phase">,
  ): Promise<void> {
    const payload: ProcessingTerminalEvent = { jobId, phase: event.phase };
    await this.redisService
      .getClient()
      .publish(`async-processing:terminal:${jobId}`, JSON.stringify(payload));
  }
}
