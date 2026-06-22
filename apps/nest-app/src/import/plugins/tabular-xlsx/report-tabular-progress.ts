import type {
  TabularProcessingPhase,
  TabularProcessingProgress,
} from "./tabular-processing.types";

export async function reportTabularProgress(
  onProgress: ((detail: unknown) => Promise<void>) | undefined,
  phase: TabularProcessingPhase,
  sourceId: string,
  options?: {
    worksheetName?: string;
    originalName?: string;
    percent?: number;
  },
): Promise<void> {
  if (!onProgress) {
    return;
  }

  const event: TabularProcessingProgress = {
    phase,
    sourceId,
    worksheetName: options?.worksheetName,
    originalName: options?.originalName,
    percent: options?.percent,
  };
  await onProgress(event);
}
