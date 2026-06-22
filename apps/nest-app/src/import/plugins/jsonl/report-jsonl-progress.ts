import type {
  JsonlPluginPhase,
  JsonlProcessingProgress,
} from "./jsonl-processing.types";

export async function reportJsonlProgress(
  onProgress: ((detail: unknown) => Promise<void>) | undefined,
  phase: JsonlPluginPhase,
  sourceId: string,
  options?: { originalName?: string; percent?: number },
): Promise<void> {
  if (!onProgress) {
    return;
  }

  const event: JsonlProcessingProgress = {
    phase,
    sourceId,
    originalName: options?.originalName,
    percent: options?.percent,
  };
  await onProgress(event);
}
