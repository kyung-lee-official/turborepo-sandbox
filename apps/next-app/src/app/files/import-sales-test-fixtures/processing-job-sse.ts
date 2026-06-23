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

export type ProcessingJobPhase = ProcessingJobResponse["phase"];

export type DomainLayerStage = {
  label: string;
  detail?: string;
  percent?: number;
};

export type UploadProgress = {
  detail?: string;
  percent?: number;
};

export type ImportJobProgressDisplay = {
  upload?: UploadProgress | null;
  jobPhase: ProcessingJobPhase | null;
  jobPhaseDetail?: string;
  domainStage: DomainLayerStage | null;
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

export function describeUploadProgress(
  loaded: number,
  total?: number,
): UploadProgress {
  if (total != null && total > 0) {
    return {
      detail: `${formatByteCount(loaded)} / ${formatByteCount(total)}`,
      percent: Math.min(100, Math.round((loaded / total) * 100)),
    };
  }

  return {
    detail: `${formatByteCount(loaded)} uploaded`,
  };
}

export function uploadOnlyProgressDisplay(
  upload: UploadProgress,
): ImportJobProgressDisplay {
  return {
    upload,
    jobPhase: null,
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

function formatDomainStageDetail(
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

  const sourceLabel =
    typeof record.originalName === "string"
      ? record.originalName
      : typeof record.sourceId === "string"
        ? record.sourceId
        : undefined;
  const worksheet =
    typeof record.worksheetName === "string" ? record.worksheetName : undefined;
  const context = [worksheet, sourceLabel].filter(Boolean).join(" · ");
  if (context) {
    parts.push(context);
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function describeDomainStageFromProgress(
  progress: unknown,
): DomainLayerStage {
  if (!progress || typeof progress !== "object") {
    return { label: "unknown" };
  }

  const record = progress as Record<string, unknown>;
  const label = typeof record.phase === "string" ? record.phase : "unknown";
  const detail = formatDomainStageDetail(record);
  const percent =
    typeof record.percent === "number" && Number.isFinite(record.percent)
      ? Math.min(100, Math.max(0, Math.round(record.percent)))
      : undefined;

  return { label, detail, percent };
}

export function jobPhaseDetailFromSnapshot(
  snapshot: ProcessingJobSnapshot,
): string | undefined {
  if (snapshot.phase !== "complete") {
    return undefined;
  }

  const parts = [
    snapshot.outcome ?? undefined,
    snapshot.processedCount != null
      ? `${snapshot.processedCount.toLocaleString()} processed`
      : null,
    snapshot.errorCount != null && snapshot.errorCount > 0
      ? `${snapshot.errorCount.toLocaleString()} errors`
      : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function buildImportJobProgressDisplay(options: {
  upload?: UploadProgress | null;
  snapshot: ProcessingJobSnapshot;
  domainStage?: DomainLayerStage | null;
}): ImportJobProgressDisplay {
  return {
    upload: options.upload ?? null,
    jobPhase: options.snapshot.phase,
    jobPhaseDetail: jobPhaseDetailFromSnapshot(options.snapshot),
    domainStage:
      options.snapshot.phase === "processing"
        ? (options.domainStage ?? null)
        : null,
  };
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
    initialSnapshot?: ProcessingJobSnapshot;
    onDisplayChange?: (display: ImportJobProgressDisplay) => void;
    timeoutMs?: number;
  } = {},
): Promise<ProcessingJobSnapshot> {
  const timeoutMs = handlers.timeoutMs ?? 30 * 60 * 1000;

  return new Promise((resolve, reject) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;
    let lastSnapshot: ProcessingJobSnapshot = handlers.initialSnapshot ?? {
      jobId,
      domainKind: "",
      phase: "queued",
      outcome: null,
      processedCount: null,
      errorCount: null,
      hasErrors: false,
      completedAt: null,
    };
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
      handlers.onDisplayChange?.(
        buildImportJobProgressDisplay({
          snapshot: lastSnapshot,
          domainStage: lastDomainStage,
        }),
      );
    };

    if (handlers.initialSnapshot) {
      emitDisplay();
    }

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
          lastSnapshot = snapshot;
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
