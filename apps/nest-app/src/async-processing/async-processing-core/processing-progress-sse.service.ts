import { PassThrough, type Readable } from "node:stream";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { SSE_IDLE_TIMEOUT_MS } from "../async-processing.types";
import { ProcessingJobRepository } from "./processing-job.repository";

type JobSnapshot = {
  jobId: string;
  domainKind: string;
  phase: string;
  outcome: string | null;
  processedCount: number | null;
  errorCount: number | null;
  hasErrors: boolean;
  completedAt: string | null;
};

@Injectable()
export class ProcessingProgressSseService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jobRepository: ProcessingJobRepository,
  ) {}

  async streamJobEvents(jobId: string): Promise<Readable> {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Processing job not found: ${jobId}`);
    }

    const stream = new PassThrough();

    if (job.phase === "complete" || job.phase === "failed") {
      stream.write(`data: ${JSON.stringify(this.toSnapshot(job))}\n\n`);
      stream.end();
      return stream;
    }

    const subscriber = this.createSubscriber();
    const progressChannel = `async-processing:progress:${jobId}`;
    const terminalChannel = `async-processing:terminal:${jobId}`;

    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    let closed = false;

    const cleanup = async () => {
      if (closed) {
        return;
      }
      closed = true;
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      await subscriber.unsubscribe(progressChannel, terminalChannel);
      subscriber.disconnect();
      if (!stream.destroyed) {
        stream.end();
      }
    };

    const resetIdleTimer = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      idleTimer = setTimeout(async () => {
        const row = await this.jobRepository.findById(jobId);
        if (!row) {
          await cleanup();
          return;
        }
        if (row.phase === "complete" || row.phase === "failed") {
          stream.write(`data: ${JSON.stringify(this.toSnapshot(row))}\n\n`);
          await cleanup();
          return;
        }
        stream.write(`data: ${JSON.stringify(this.toSnapshot(row))}\n\n`);
        resetIdleTimer();
      }, SSE_IDLE_TIMEOUT_MS);
    };

    const emitSnapshotAndClose = async () => {
      const row = await this.jobRepository.findById(jobId);
      if (row) {
        stream.write(`data: ${JSON.stringify(this.toSnapshot(row))}\n\n`);
      }
      await cleanup();
    };

    subscriber.on("message", async (channel, message) => {
      if (channel === progressChannel) {
        stream.write(`data: ${message}\n\n`);
        resetIdleTimer();
        return;
      }

      if (channel === terminalChannel) {
        await emitSnapshotAndClose();
      }
    });

    stream.on("close", () => {
      void cleanup();
    });

    await subscriber.subscribe(progressChannel, terminalChannel);
    heartbeatTimer = setInterval(() => {
      if (!stream.destroyed) {
        stream.write(": heartbeat\n\n");
      }
    }, 15_000);
    resetIdleTimer();

    return stream;
  }

  private createSubscriber(): Redis {
    const host = this.configService.get<string>("REDIS_HOST") ?? "localhost";
    const port = Number(this.configService.get<string>("REDIS_PORT") ?? "6379");
    return new Redis({ host, port, maxRetriesPerRequest: null });
  }

  private toSnapshot(job: {
    id: string;
    domainKind: string;
    phase: string;
    outcome: string | null;
    processedCount: number | null;
    errorCount: number | null;
    completedAt: Date | null;
  }): JobSnapshot {
    return {
      jobId: job.id,
      domainKind: job.domainKind,
      phase: job.phase,
      outcome: job.outcome,
      processedCount: job.processedCount,
      errorCount: job.errorCount,
      hasErrors: (job.errorCount ?? 0) > 0,
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }
}
