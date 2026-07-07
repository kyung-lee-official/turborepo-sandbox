import {
  buildImportJobProgressDisplay,
  type ImportJobProgressDisplay,
  type ProcessingJobSnapshot,
  subscribeProcessingJobEvents,
} from "../import-sales-test-fixtures/processing-job-sse";

export type PdfDomainStage = {
  label: string;
  detail?: string;
  percent?: number;
};

export function describePdfDomainStage(progress: unknown): PdfDomainStage {
  if (!progress || typeof progress !== "object") {
    return { label: "unknown" };
  }

  const record = progress as Record<string, unknown>;
  const phase = typeof record.phase === "string" ? record.phase : "unknown";
  const email = typeof record.email === "string" ? record.email : undefined;
  const explicitDetail =
    typeof record.detail === "string" ? record.detail : undefined;
  const label = phase.replaceAll("_", " ");
  const detail = email
    ? `for ${email}`
    : explicitDetail
      ? explicitDetail
      : undefined;
  const percent =
    typeof record.percent === "number" && Number.isFinite(record.percent)
      ? Math.min(100, Math.max(0, Math.round(record.percent)))
      : undefined;

  return { label, detail, percent };
}

export function formatPdfProgressText(
  display: ImportJobProgressDisplay,
): string | null {
  if (display.jobPhase === "processing" && display.domainStage) {
    const parts = [display.domainStage.label];
    if (display.domainStage.detail) {
      parts.push(display.domainStage.detail);
    }
    return parts.join(" ");
  }

  if (display.jobPhase === "queued") {
    return "queued";
  }

  if (display.jobPhase === "complete") {
    return display.jobPhaseDetail ?? "complete";
  }

  if (display.jobPhase === "failed") {
    return "failed";
  }

  return null;
}

export function waitForPdfJobViaSse(
  jobId: string,
  nestBaseUrl: string | undefined,
  handlers: {
    onDisplayChange?: (display: ImportJobProgressDisplay) => void;
    timeoutMs?: number;
  } = {},
): Promise<ProcessingJobSnapshot> {
  const timeoutMs = handlers.timeoutMs ?? 30 * 60 * 1000;

  return new Promise((resolve, reject) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;
    let lastSnapshot: ProcessingJobSnapshot = {
      jobId,
      domainKind: "async-generate-pdf",
      phase: "queued",
      outcome: null,
      processedCount: null,
      errorCount: null,
      hasErrors: false,
      completedAt: null,
    };
    let lastDomainStage: PdfDomainStage | null = null;

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

    const timeoutId = setTimeout(() => {
      finish(() => reject(new Error(`Timed out waiting for job ${jobId}`)));
    }, timeoutMs);

    try {
      unsubscribe = subscribeProcessingJobEvents(jobId, nestBaseUrl, {
        onProgress: (event) => {
          lastDomainStage = describePdfDomainStage(event.progress);
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
