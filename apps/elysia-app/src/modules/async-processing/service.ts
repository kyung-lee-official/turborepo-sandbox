import { status } from "elysia";
import { nanoid } from "nanoid";
import { domainRegistry } from "./domain-registry.ts";
import {
  createQueuedJob,
  deleteJobById,
  finalizeJob,
  findJobById,
  findJobs,
  type ProcessingJob,
} from "./processing-job.repository.ts";
import {
  mapProcessingJobToResponse,
  type ProcessingJobResponseDto,
} from "./processing-job-response.mapper.ts";
import type { StartProcessingInput } from "./types.ts";

const LIST_LIMIT_DEFAULT = 20;
const LIST_LIMIT_MAX = 100;

const PROCESSING_PHASES = [
  "queued",
  "processing",
  "complete",
  "failed",
] as const;
type ProcessingPhase = (typeof PROCESSING_PHASES)[number];

function parsePhaseQuery(
  value: string | undefined,
): ProcessingPhase[] | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const phases = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (phases.length === 0) {
    return undefined;
  }
  for (const phase of phases) {
    if (!(PROCESSING_PHASES as readonly string[]).includes(phase)) {
      throw status(400, {
        error: `Invalid phase: ${phase}. Valid: ${PROCESSING_PHASES.join(", ")}`,
      });
    }
  }
  return phases as ProcessingPhase[];
}

function parsePositiveInt(
  value: string | undefined,
  defaultValue: number,
  max: number,
): number {
  if (!value) {
    return defaultValue;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > max) {
    throw status(400, { error: `Invalid value: ${value}` });
  }
  return parsed;
}

function validateSources(
  sources: Record<string, unknown>,
  specs: { sourceId: string; required: boolean }[],
): void {
  for (const spec of specs) {
    if (!spec.required) continue;
    const entry = sources[spec.sourceId];
    if (!entry || typeof entry !== "object") {
      throw status(400, {
        error: `Missing required sourceId: ${spec.sourceId}`,
      });
    }
    const entrySourceId = (entry as { sourceId?: unknown }).sourceId;
    if (entrySourceId !== spec.sourceId) {
      throw status(400, {
        error: `Source key ${spec.sourceId} must match entry.sourceId ${String(entrySourceId)}`,
      });
    }
  }
}

async function readErrorsPayloads(
  processingJobId: string,
): Promise<readonly { message: string }[]> {
  const prisma = await import("../../shared/db.ts").then((m) => m.getPrisma());
  const rows = await prisma.processingJobError.findMany({
    where: { processingJobId },
    orderBy: { sequence: "asc" },
    select: { payload: true },
  });
  return rows.map((row) => row.payload as { message: string });
}

export async function listJobs(input: {
  phase?: string | undefined;
  domainKind?: string | undefined;
  limit?: string | undefined;
  cursor?: string | undefined;
}): Promise<{
  jobs: ProcessingJobResponseDto[];
  nextCursor: string | null;
}> {
  const phases = parsePhaseQuery(input.phase);
  const limit = parsePositiveInt(
    input.limit,
    LIST_LIMIT_DEFAULT,
    LIST_LIMIT_MAX,
  );

  const { jobs, nextCursor } = await findJobs({
    phases,
    domainKind: input.domainKind,
    limit,
    cursor: input.cursor,
  });

  return {
    jobs: jobs.map(mapProcessingJobToResponse),
    nextCursor,
  };
}

export async function getJob(jobId: string): Promise<ProcessingJobResponseDto> {
  const job = await findJobById(jobId);
  if (!job) {
    throw status(404, { error: `Processing job not found: ${jobId}` });
  }
  return mapProcessingJobToResponse(job);
}

export async function getErrorsJsonl(jobId: string): Promise<string> {
  const job = await findJobById(jobId);
  if (!job) {
    throw status(404, { error: `Processing job not found: ${jobId}` });
  }
  if (job.outcome !== "validation_failed" || (job.errorCount ?? 0) === 0) {
    throw status(404, { error: `No error report for job: ${jobId}` });
  }

  const errors = await readErrorsPayloads(jobId);
  if (errors.length === 0) {
    throw status(404, { error: `No error report for job: ${jobId}` });
  }

  const lines = [
    JSON.stringify({
      kind: "header",
      jobId: job.id,
      domainKind: job.domainKind,
      errorCount: job.errorCount ?? errors.length,
    }),
    ...errors.map((error) => JSON.stringify({ kind: "error", ...error })),
  ];

  return lines.join("\n");
}

export async function startProcessing(
  input: StartProcessingInput,
): Promise<{ jobId: string; manifestId: string }> {
  const registration = domainRegistry.getByDomainKind(input.domainKind);
  validateSources(
    input.sources as Record<string, unknown>,
    registration.sourceSpecs,
  );

  const jobId = nanoid();
  const manifestId = nanoid();

  await createQueuedJob({
    jobId,
    domainKind: input.domainKind,
    manifestId,
    sources: input.sources,
    context: input.context,
  });

  return { jobId, manifestId };
}

export async function deleteJob(jobId: string): Promise<void> {
  await deleteJobById(jobId);
}

export async function markFailed(jobId: string): Promise<void> {
  await finalizeJob(jobId, {
    phase: "failed",
    outcome: "failed",
    completedAt: new Date(),
  });
}

export async function markComplete(
  jobId: string,
  result: {
    outcome: "success" | "validation_failed";
    processedCount: number;
    errorCount: number;
  },
): Promise<void> {
  await finalizeJob(jobId, {
    phase: "complete",
    outcome: result.outcome,
    processedCount: result.processedCount,
    errorCount: result.errorCount,
    completedAt: new Date(),
  });
}

export type { ProcessingJob };
