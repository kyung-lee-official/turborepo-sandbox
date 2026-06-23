import type {
  DomainProcessingPhase,
  DomainProcessingProgress,
} from "./domain-processing.types";
import { percentFromCounts } from "./percent-from-counts";

export async function reportDomainProgress(
  onProgress: ((detail: unknown) => Promise<void>) | undefined,
  phase: DomainProcessingPhase,
  sourceId: string,
  options?: {
    originalName?: string;
    worksheetName?: string;
    totalCount?: number;
    processedCount?: number;
    validCount?: number;
    errorCount?: number;
    percent?: number;
  },
): Promise<void> {
  if (!onProgress) {
    return;
  }

  const percent =
    options?.percent ??
    (options?.processedCount != null && options?.totalCount != null
      ? percentFromCounts(options.processedCount, options.totalCount)
      : undefined);

  const event: DomainProcessingProgress = {
    phase,
    sourceId,
    originalName: options?.originalName,
    worksheetName: options?.worksheetName,
    totalCount: options?.totalCount,
    processedCount: options?.processedCount,
    validCount: options?.validCount,
    errorCount: options?.errorCount,
    percent,
  };
  await onProgress(event);
}
