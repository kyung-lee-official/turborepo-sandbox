import type {
  DomainProcessingPhase,
  DomainProcessingProgress,
} from "./domain-processing.types";

export async function reportDomainProgress(
  onProgress: ((detail: unknown) => Promise<void>) | undefined,
  phase: DomainProcessingPhase,
  sourceId: string,
  options?: {
    originalName?: string;
    worksheetName?: string;
    percent?: number;
  },
): Promise<void> {
  if (!onProgress) {
    return;
  }

  const event: DomainProcessingProgress = {
    phase,
    sourceId,
    originalName: options?.originalName,
    worksheetName: options?.worksheetName,
    percent: options?.percent,
  };
  await onProgress(event);
}
