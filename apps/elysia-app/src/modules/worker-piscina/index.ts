import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import { Elysia, t } from "elysia";
import { Piscina } from "piscina";

const pool = new Piscina({
  filename: resolve(import.meta.dirname, "heavy-task.worker.ts"),
  minThreads: 1,
  maxThreads: 4,
});

const progressEmitter = new EventEmitter();
pool.on("message", (msg: { requestId: string; percent: number }) => {
  progressEmitter.emit(`progress:${msg.requestId}`, msg.percent);
});

const maxQuery = t.Object({ max: t.Optional(t.String()) });

export const workerPiscinaRoutes = new Elysia({ prefix: "/worker/piscina" })
  .get("/ping", () => ({ pong: true, at: new Date().toISOString() }))
  .get(
    "/count-primes",
    async ({ query }) => {
      const max = query.max ? Number(query.max) : 1_000_000;
      const start = performance.now();
      const primes = await pool.run({ max, requestId: "inline" });
      const durationMs = Math.round(performance.now() - start);
      return { primes, durationMs };
    },
    { query: maxQuery },
  )
  .get(
    "/count-primes/stream",
    ({ query, set }) => {
      set.headers["Content-Type"] = "text/event-stream";

      const max = query.max ? Number(query.max) : 1_000_000;
      const requestId = crypto.randomUUID();
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        start(controller) {
          const onProgress = (percent: number) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ percent })}\n\n`),
            );
          };
          progressEmitter.on(`progress:${requestId}`, onProgress);

          const start = performance.now();
          pool
            .run({ max, requestId })
            .then((primes) => {
              const durationMs = Math.round(performance.now() - start);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ percent: 100, primes, durationMs })}\n\n`,
                ),
              );
              progressEmitter.off(`progress:${requestId}`, onProgress);
              setTimeout(() => controller.close(), 100);
            })
            .catch((err: unknown) => {
              progressEmitter.off(`progress:${requestId}`, onProgress);
              controller.error(err);
            });
        },
        cancel() {
          progressEmitter.removeAllListeners(`progress:${requestId}`);
        },
      });

      return new Response(stream);
    },
    { query: maxQuery },
  );
