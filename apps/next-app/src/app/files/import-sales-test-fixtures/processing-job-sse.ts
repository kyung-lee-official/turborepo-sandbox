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

export type JobLayerPhase = {
  label: string;
  detail?: string;
  percent?: number;
};

export type DomainLayerStage = {
  label: string;
  detail?: string;
  percent?: number;
};

export type ImportJobProgressDisplay = {
  jobPhase: JobLayerPhase;
  domainStage?: DomainLayerStage | null;
};

/** @deprecated Use ImportJobProgressDisplay */
export type CurrentJobPhase = JobLayerPhase & {
  percent?: number;
};

function formatByteCount(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes.toLocaleString()} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function describeUploadProgressDisplay(
  loaded: number,
  total?: number,
): ImportJobProgressDisplay {
  if (total != null && total > 0) {
    return {
      jobPhase: {
        label: "Uploading files",
        detail: `${formatByteCount(loaded)} / ${formatByteCount(total)}`,
        percent: Math.min(100, Math.round((loaded / total) * 100)),
      },
      domainStage: null,
    };
  }

  return {
    jobPhase: {
      label: "Uploading files",
      detail: `${formatByteCount(loaded)} uploaded`,
    },
    domainStage: null,
  };
}

function readCount(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function formatPhaseProgressDetail(
  record: Record<string, unknown>,
): string | undefined {
  const processedCount = readCount(record, "processedCount");
  const totalCount = readCount(record, "totalCount");
  const validCount = readCount(record, "validCount");
  const errorCount = readCount(record, "errorCount");

  const parts: string[] = [];

  if (processedCount != null && totalCount != null && totalCount > 0) {
    parts.push(
      `${processedCount.toLocaleString()} / ${totalCount.toLocaleString()} rows`,
    );
  } else if (typeof record.percent === "number") {
    parts.push(`${record.percent}%`);
  }

  if (validCount != null && errorCount != null && errorCount > 0) {
    parts.push(
      `${validCount.toLocaleString()} valid · ${errorCount.toLocaleString()} errors`,
    );
  } else if (
    validCount != null &&
    processedCount != null &&
    validCount !== processedCount
  ) {
    parts.push(`${validCount.toLocaleString()} valid`);
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function describeDomainStageFromProgress(
  progress: unknown,
): DomainLayerStage {
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
  const progressDetail = formatPhaseProgressDetail(record);
  const detail =
    [progressDetail, context].filter(Boolean).join(" · ") || undefined;
  const percent =
    typeof record.percent === "number" && Number.isFinite(record.percent)
      ? Math.min(100, Math.max(0, Math.round(record.percent)))
      : undefined;

  switch (record.phase) {
    case "validating_rows":
      return { label: "Validating rows", detail, percent };
    case "saving_database":
      return { label: "Saving to database", detail, percent };
    case "parsing_workbook":
      return {
        label: "Parsing workbook",
        detail: context || undefined,
        percent,
      };
    case "parsing_lines":
      return { label: "Parsing JSONL", detail: context || undefined, percent };
    default:
      return {
        label: typeof record.phase === "string" ? record.phase : "Processing",
        detail: detail ?? (context || undefined),
        percent,
      };
  }
}

/** @deprecated Use describeDomainStageFromProgress */
export function describeProcessingProgress(progress: unknown): CurrentJobPhase {
  return describeDomainStageFromProgress(progress);
}

export function describeJobLayerPhaseFromSnapshot(
  snapshot: ProcessingJobSnapshot,
): JobLayerPhase {
  switch (snapshot.phase) {
    case "queued":
      return { label: "Queued", detail: "queued" };
    case "processing":
      return { label: "Processing", detail: "processing" };
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
      return { label: "Failed", detail: "failed" };
    default:
      return { label: snapshot.phase, detail: snapshot.phase };
  }
}

/** @deprecated Use describeJobLayerPhaseFromSnapshot */
export function describeJobSnapshot(
  snapshot: ProcessingJobSnapshot,
): CurrentJobPhase {
  return describeJobLayerPhaseFromSnapshot(snapshot);
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
    onDisplayChange?: (display: ImportJobProgressDisplay) => void;
    /** @deprecated Use onDisplayChange */
    onPhaseChange?: (phase: CurrentJobPhase) => void;
    timeoutMs?: number;
  } = {},
): Promise<ProcessingJobSnapshot> {
  const timeoutMs = handlers.timeoutMs ?? 30 * 60 * 1000;

  return new Promise((resolve, reject) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;
    let lastJobPhase: JobLayerPhase = { label: "Processing" };
    let lastDomainStage: DomainLayerStage | null = null;

    const finish = (action: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      unsubscribe?.();
      action();
    };

    const emitDisplay = () => {
      const display: ImportJobProgressDisplay = {
        jobPhase: lastJobPhase,
        domainStage: lastDomainStage,
      };
      handlers.onDisplayChange?.(display);
      handlers.onPhaseChange?.(lastDomainStage ?? lastJobPhase);
    };

    const timeoutId = setTimeout(() => {
      finish(() => reject(new Error(`Timed out waiting for job ${jobId}`)));
    }, timeoutMs);

    try {
      unsubscribe = subscribeProcessingJobEvents(jobId, nestBaseUrl, {
        onProgress: (event) => {
          lastDomainStage = describeDomainStageFromProgress(event.progress);
          emitDisplay();
        },
        onSnapshot: (snapshot) => {
          lastJobPhase = describeJobLayerPhaseFromSnapshot(snapshot);
          if (snapshot.phase !== "processing") {
            lastDomainStage = null;
          }
          emitDisplay();
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
