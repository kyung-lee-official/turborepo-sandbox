import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import { Injectable, type MessageEvent, OnModuleDestroy } from "@nestjs/common";
import { Piscina } from "piscina";
import { Observable } from "rxjs";

@Injectable()
export class PiscinaService implements OnModuleDestroy {
  private readonly pool = new Piscina({
    filename: resolve(__dirname, "heavy-task.worker.js"),
    minThreads: 1,
    maxThreads: 4,
  });

  private readonly progressEmitter = new EventEmitter();

  constructor() {
    this.pool.on("message", (msg: { requestId: string; percent: number }) => {
      this.progressEmitter.emit(`progress:${msg.requestId}`, msg.percent);
    });
  }

  async runHeavyTask(
    max: number,
  ): Promise<{ primes: number; durationMs: number }> {
    const start = performance.now();
    const primes = await this.pool.run({ max, requestId: "inline" });
    const durationMs = Math.round(performance.now() - start);
    return { primes, durationMs };
  }

  streamProgress(requestId: string, max: number): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const start = performance.now();
      const onProgress = (percent: number) => {
        subscriber.next({ data: { percent } });
      };

      this.progressEmitter.on(`progress:${requestId}`, onProgress);

      this.pool
        .run({ max, requestId })
        .then((primes) => {
          const durationMs = Math.round(performance.now() - start);
          subscriber.next({ data: { percent: 100, primes, durationMs } });
          // Small delay to ensure the SSE event is flushed before the connection closes
          setTimeout(() => subscriber.complete(), 100);
        })
        .catch((err) => subscriber.error(err));

      return () => {
        this.progressEmitter.off(`progress:${requestId}`, onProgress);
      };
    });
  }

  async onModuleDestroy() {
    await this.pool.destroy();
  }
}
