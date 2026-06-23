import type { ProcessingJobResponse } from "./api";

export type ProcessingProgressEvent = {
  jobId: string;
  progress: unknown;
};

export type ProcessingJobSnapshot = Pick<
  ProcessingJobResponse,
  | "jobId"
  | "domainKind"
  | "phase"
  | "outcome"
  | "processedCount"
  | "errorCount"
  | "hasErrors"
  | "completedAt"
>;

export type CurrentJobPhase = {
  label: string;
  detail?: string;
};

export function describeProcessingProgress(progress: unknown): CurrentJobPhase {
  if (!progress || typeof progress !== "object") {
    return { label: "Processing" };
  }

  const record = progress as Record<string, unknown>;
  const sourceLabel =
    typeof record.originalName === "string"
      ? record.originalName
      : typeof record.sourceId === "string"
        ? record.sourceId
        : undefined;
  const worksheet =
    typeof record.worksheetName === "string" ? record.worksheetName : undefined;
  const context = [worksheet, sourceLabel].filter(Boolean).join(" · ");

  switch (record.phase) {
    case "validating_rows":
      return { label: "Validating rows", detail: context || undefined };
    case "saving_database":
      return {
        label: "Saving to database",
        detail:
          typeof record.percent === "number"
            ? `${record.percent}%`
            : context || undefined,
      };
    case "parsing_workbook":
      return { label: "Parsing workbook", detail: context || undefined };
    case "parsing_lines":
      return { label: "Parsing JSONL", detail: context || undefined };
    default:
      return {
        label: typeof record.phase === "string" ? record.phase : "Processing",
        detail: context || undefined,
      };
  }
}

export function describeJobSnapshot(
  snapshot: ProcessingJobSnapshot,
): CurrentJobPhase {
  switch (snapshot.phase) {
    case "queued":
      return { label: "Queued" };
    case "processing":
      return { label: "Processing" };
    case "complete": {
      const parts = [
        snapshot.outcome ?? "complete",
        snapshot.processedCount != null
          ? `${snapshot.processedCount.toLocaleString()} processed`
          : null,
        snapshot.errorCount != null && snapshot.errorCount > 0
          ? `${snapshot.errorCount.toLocaleString()} errors`
          : null,
      ].filter(Boolean);
      return { label: "Complete", detail: parts.join(" · ") };
    }
    case "failed":
      return { label: "Failed" };
    default:
      return { label: snapshot.phase };
  }
}

function isProgressEvent(data: unknown): data is ProcessingProgressEvent {
  return (
    !!data && typeof data === "object" && "progress" in data && "jobId" in data
  );
}

function isJobSnapshot(data: unknown): data is ProcessingJobSnapshot {
  return (
    !!data &&
    typeof data === "object" &&
    "phase" in data &&
    "domainKind" in data &&
    !("progress" in data)
  );
}

export function subscribeProcessingJobEvents(
  jobId: string,
  nestBaseUrl: string | undefined,
  handlers: {
    onProgress?: (event: ProcessingProgressEvent) => void;
    onSnapshot?: (snapshot: ProcessingJobSnapshot) => void;
    onError?: (error: Event) => void;
  },
): () => void {
  if (!nestBaseUrl) {
    throw new Error("NEXT_PUBLIC_NESTJS is not configured");
  }

  const url = `${nestBaseUrl.replace(/\/$/, "")}/jobs/${jobId}/events`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data: unknown = JSON.parse(event.data);
      if (isProgressEvent(data)) {
        handlers.onProgress?.(data);
        return;
      }
      if (isJobSnapshot(data)) {
        handlers.onSnapshot?.(data);
      }
    } catch (error) {
      console.error("Failed to parse processing job SSE message:", error);
    }
  };

  eventSource.onerror = (error) => {
    handlers.onError?.(error);
  };

  return () => {
    eventSource.close();
  };
}

export function waitForProcessingJobViaSse(
  jobId: string,
  nestBaseUrl: string | undefined,
  handlers: {
    onPhaseChange?: (phase: CurrentJobPhase) => void;
    timeoutMs?: number;
  } = {},
): Promise<ProcessingJobSnapshot> {
  const timeoutMs = handlers.timeoutMs ?? 30 * 60 * 1000;

  return new Promise((resolve, reject) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;

    const finish = (action: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      unsubscribe?.();
      action();
    };

    const updatePhase = (phase: CurrentJobPhase) => {
      handlers.onPhaseChange?.(phase);
    };

    const timeoutId = setTimeout(() => {
      finish(() => reject(new Error(`Timed out waiting for job ${jobId}`)));
    }, timeoutMs);

    try {
      unsubscribe = subscribeProcessingJobEvents(jobId, nestBaseUrl, {
        onProgress: (event) => {
          updatePhase(describeProcessingProgress(event.progress));
        },
        onSnapshot: (snapshot) => {
          updatePhase(describeJobSnapshot(snapshot));
          if (snapshot.phase === "complete" || snapshot.phase === "failed") {
            finish(() => resolve(snapshot));
          }
        },
      });
    } catch (error) {
      finish(() => reject(error));
    }
  });
}
