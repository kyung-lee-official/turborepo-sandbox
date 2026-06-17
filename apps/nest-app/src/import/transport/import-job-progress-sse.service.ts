import type { MessageEvent } from "@nestjs/common";
import { Injectable, NotFoundException } from "@nestjs/common";
import type Redis from "ioredis";
import { Observable } from "rxjs";
import { RedisService } from "../../redis/redis.service";
import type { JobMeta } from "./async-import.types";
import { ImportJobStoreService } from "./import-job-store.service";

const HEARTBEAT_INTERVAL_MS = 15_000;

@Injectable()
export class ImportJobProgressSseService {
  constructor(
    private readonly redisService: RedisService,
    private readonly jobStore: ImportJobStoreService,
  ) {}

  streamByJobId(jobId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((observer) => {
      let subscriber: Redis | undefined;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let closed = false;

      const teardown = () => {
        if (closed) {
          return;
        }
        closed = true;
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = undefined;
        }
        if (subscriber) {
          const channel = this.jobStore.buildEventsChannelFromJobId(jobId);
          const client = subscriber;
          subscriber = undefined;
          void client.unsubscribe(channel).finally(() => {
            client.disconnect();
          });
        }
      };

      const completeStream = () => {
        teardown();
        observer.complete();
      };

      const failStream = (error: unknown) => {
        teardown();
        observer.error(error);
      };

      const emitMeta = (meta: JobMeta) => {
        if (closed) {
          return;
        }
        observer.next({ data: meta });
        if (meta.phase === "complete" || meta.phase === "failed") {
          completeStream();
        }
      };

      heartbeat = setInterval(() => {
        if (!closed) {
          observer.next({ type: "heartbeat", data: "" });
        }
      }, HEARTBEAT_INTERVAL_MS);

      void (async () => {
        try {
          const current = await this.jobStore.getMetaByJobId(jobId);
          if (!current) {
            failStream(new NotFoundException(`Job ${jobId} not found`));
            return;
          }

          emitMeta(current);
          if (closed) {
            return;
          }

          subscriber = this.redisService.getClient().duplicate();
          const channel = this.jobStore.buildEventsChannelFromJobId(jobId);
          subscriber.on("message", (receivedChannel, message) => {
            if (receivedChannel !== channel || closed) {
              return;
            }
            try {
              emitMeta(JSON.parse(message) as JobMeta);
            } catch {
              // ignore malformed pub/sub payloads
            }
          });
          await subscriber.subscribe(channel);
        } catch (error) {
          failStream(error);
        }
      })();

      return () => {
        teardown();
      };
    });
  }
}
