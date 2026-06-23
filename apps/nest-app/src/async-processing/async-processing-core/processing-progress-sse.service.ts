import type { MessageEvent } from "@nestjs/common";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { Observable } from "rxjs";
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

  streamJobEvents(jobId: string): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      let closed = false;
      let idleTimer: ReturnType<typeof setTimeout> | undefined;
      let subscriberRedis: Redis | undefined;
      const progressChannel = `async-processing:progress:${jobId}`;
      const terminalChannel = `async-processing:terminal:${jobId}`;

      const cleanup = async () => {
        if (closed) {
          return;
        }
        closed = true;
        if (idleTimer) {
          clearTimeout(idleTimer);
        }
        if (subscriberRedis) {
          await subscriberRedis.unsubscribe(progressChannel, terminalChannel);
          subscriberRedis.disconnect();
          subscriberRedis = undefined;
        }
      };

      const emitSnapshot = (job: {
        id: string;
        domainKind: string;
        phase: string;
        outcome: string | null;
        processedCount: number | null;
        errorCount: number | null;
        completedAt: Date | null;
      }) => {
        subscriber.next({ data: this.toSnapshot(job) });
      };

      const resetIdleTimer = () => {
        if (idleTimer) {
          clearTimeout(idleTimer);
        }
        idleTimer = setTimeout(async () => {
          const row = await this.jobRepository.findById(jobId);
          if (!row) {
            await cleanup();
            subscriber.complete();
            return;
          }
          emitSnapshot(row);
          if (row.phase === "complete" || row.phase === "failed") {
            await cleanup();
            subscriber.complete();
            return;
          }
          resetIdleTimer();
        }, SSE_IDLE_TIMEOUT_MS);
      };

      const emitSnapshotAndComplete = async () => {
        const row = await this.jobRepository.findById(jobId);
        if (row) {
          emitSnapshot(row);
        }
        await cleanup();
        subscriber.complete();
      };

      void (async () => {
        try {
          const job = await this.jobRepository.findById(jobId);
          if (!job) {
            subscriber.error(
              new NotFoundException(`Processing job not found: ${jobId}`),
            );
            return;
          }

          if (job.phase === "complete" || job.phase === "failed") {
            emitSnapshot(job);
            subscriber.complete();
            return;
          }

          subscriberRedis = this.createSubscriber();

          subscriberRedis.on("message", (channel, message) => {
            if (channel === progressChannel) {
              try {
                subscriber.next({
                  data: JSON.parse(message) as Record<string, unknown>,
                });
              } catch {
                subscriber.next({ data: message });
              }
              resetIdleTimer();
              return;
            }

            if (channel === terminalChannel) {
              void emitSnapshotAndComplete();
            }
          });

          await subscriberRedis.subscribe(progressChannel, terminalChannel);
          resetIdleTimer();
        } catch (error) {
          await cleanup();
          subscriber.error(error);
        }
      })();

      return () => {
        void cleanup();
      };
    });
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
