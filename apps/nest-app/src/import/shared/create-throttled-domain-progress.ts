import type { DomainProcessingPhase } from "./domain-processing.types";
import { percentFromCounts } from "./percent-from-counts";
import { reportDomainProgress } from "./report-domain-progress";

export const DOMAIN_PROGRESS_EMIT_INTERVAL_MS = 1000;

export type PhaseProgressCounts = {
  totalCount: number;
  processedCount: number;
  validCount?: number;
  errorCount?: number;
};

type ThrottledDomainProgressReporter = {
  report: (counts: PhaseProgressCounts) => Promise<void>;
  flush: (counts: PhaseProgressCounts) => Promise<void>;
};

export function createThrottledDomainProgressReporter(
  onProgress: ((detail: unknown) => Promise<void>) | undefined,
  phase: DomainProcessingPhase,
  sourceId: string,
  context: { originalName?: string; worksheetName?: string },
  intervalMs = DOMAIN_PROGRESS_EMIT_INTERVAL_MS,
): ThrottledDomainProgressReporter {
  let lastEmitAt = 0;
  let latestCounts: PhaseProgressCounts | null = null;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTrailing = () => {
    if (trailingTimer) {
      clearTimeout(trailingTimer);
      trailingTimer = null;
    }
  };

  const emitNow = async (counts: PhaseProgressCounts) => {
    clearTrailing();
    latestCounts = counts;
    lastEmitAt = Date.now();
    await reportDomainProgress(onProgress, phase, sourceId, {
      ...context,
      ...counts,
      percent: percentFromCounts(counts.processedCount, counts.totalCount),
    });
  };

  const scheduleTrailing = () => {
    if (trailingTimer || !latestCounts) {
      return;
    }
    const delay = Math.max(0, intervalMs - (Date.now() - lastEmitAt));
    trailingTimer = setTimeout(() => {
      trailingTimer = null;
      if (latestCounts) {
        void emitNow(latestCounts);
      }
    }, delay);
  };

  return {
    report: async (counts) => {
      latestCounts = counts;
      const now = Date.now();
      if (now - lastEmitAt >= intervalMs) {
        await emitNow(counts);
        return;
      }
      scheduleTrailing();
    },
    flush: async (counts) => {
      await emitNow(counts);
    },
  };
}
