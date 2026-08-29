import { status } from "elysia";
import { findJobById } from "./processing-job.repository.ts";
import { mapProcessingJobToResponse } from "./processing-job-response.mapper.ts";
import { progressPublisher } from "./progress-publisher.ts";

const SSE_IDLE_TIMEOUT_MS = 60_000;

export function buildJobEventsStream(jobId: string): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const job = await findJobById(jobId);
      if (!job) {
        controller.error(new Error(`Processing job not found: ${jobId}`));
        return;
      }

      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let closed = false;
      let idleTimer: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (idleTimer) clearTimeout(idleTimer);
        progressPublisher.removeAllListeners(jobId);
      };

      const resetIdleTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(async () => {
          const row = await findJobById(jobId);
          if (!row) {
            cleanup();
            controller.close();
            return;
          }
          sendEvent(mapProcessingJobToResponse(row));
          if (row.phase === "complete" || row.phase === "failed") {
            cleanup();
            controller.close();
            return;
          }
          resetIdleTimer();
        }, SSE_IDLE_TIMEOUT_MS);
      };

      sendEvent(mapProcessingJobToResponse(job));

      if (job.phase === "complete" || job.phase === "failed") {
        controller.close();
        return;
      }

      progressPublisher.onProgress(jobId, (progress) => {
        if (closed) return;
        sendEvent({ progress });
        resetIdleTimer();
      });

      progressPublisher.onTerminal(jobId, async () => {
        if (closed) return;
        const row = await findJobById(jobId);
        if (row) {
          sendEvent(mapProcessingJobToResponse(row));
        }
        cleanup();
        controller.close();
      });

      resetIdleTimer();
    },
    cancel() {
      progressPublisher.removeAllListeners(jobId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function streamJobEventsOrThrow(jobId: string): Promise<Response> {
  const job = await findJobById(jobId);
  if (!job) {
    throw status(404, { error: `Processing job not found: ${jobId}` });
  }
  return buildJobEventsStream(jobId);
}
