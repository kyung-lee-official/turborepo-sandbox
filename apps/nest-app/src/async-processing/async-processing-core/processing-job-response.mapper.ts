import type { ProcessingJob } from "../async-processing.types";

export type ProcessingJobResponseDto = {
  jobId: string;
  domainKind: string;
  phase: ProcessingJob["phase"];
  outcome: ProcessingJob["outcome"];
  processedCount: number | null;
  errorCount: number | null;
  hasErrors: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export function mapProcessingJobToResponse(
  job: ProcessingJob,
): ProcessingJobResponseDto {
  return {
    jobId: job.id,
    domainKind: job.domainKind,
    phase: job.phase,
    outcome: job.outcome,
    processedCount: job.processedCount,
    errorCount: job.errorCount,
    hasErrors: (job.errorCount ?? 0) > 0,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}
