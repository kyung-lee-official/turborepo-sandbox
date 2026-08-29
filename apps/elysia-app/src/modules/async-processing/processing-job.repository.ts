import { getPrisma } from "../../shared/db.ts";
import type {
  ProcessingJob,
  ProcessingOutcome,
  ProcessingPhase,
  ProcessingSource,
} from "./types.ts";

type PrismaProcessingJob = Awaited<
  ReturnType<ReturnType<typeof getPrisma>["processingJob"]["findUnique"]>
>;

function nonNull<T>(value: T | null): T {
  if (value == null) {
    throw new Error("Expected value, got null");
  }
  return value;
}

export async function createQueuedJob(input: {
  jobId: string;
  domainKind: string;
  manifestId: string;
  sources: Record<string, ProcessingSource>;
  context?: Record<string, unknown>;
}): Promise<ProcessingJob> {
  const prisma = getPrisma();
  return (await prisma.$transaction(async (tx) => {
    const job = await tx.processingJob.create({
      data: {
        id: input.jobId,
        domainKind: input.domainKind,
        phase: "queued",
      },
    });
    await tx.processingManifest.create({
      data: {
        id: input.manifestId,
        jobId: input.jobId,
        domainKind: input.domainKind,
        sources: input.sources as never,
        context: input.context as never,
      },
    });
    return job;
  })) as unknown as ProcessingJob;
}

export async function claimProcessingPhase(jobId: string): Promise<boolean> {
  const prisma = getPrisma();
  const result = await prisma.processingJob.updateMany({
    where: { id: jobId, phase: "queued" },
    data: { phase: "processing" },
  });
  return result.count === 1;
}

export async function finalizeJob(
  jobId: string,
  patch: {
    phase: "complete" | "failed";
    outcome?: ProcessingOutcome;
    processedCount?: number;
    errorCount?: number;
    completedAt: Date;
  },
): Promise<void> {
  const prisma = getPrisma();
  await prisma.processingJob.update({
    where: { id: jobId },
    data: patch as never,
  });
}

export async function findJobById(
  jobId: string,
): Promise<ProcessingJob | null> {
  const prisma = getPrisma();
  const job = (await prisma.processingJob.findUnique({
    where: { id: jobId },
  })) as unknown as ProcessingJob | null;
  return job;
}

export async function findJobs(input: {
  phases?: ProcessingPhase[];
  domainKind?: string;
  limit: number;
  cursor?: string;
}): Promise<{ jobs: ProcessingJob[]; nextCursor: string | null }> {
  const prisma = getPrisma();

  const where: Record<string, unknown> = {};
  if (input.phases?.length) {
    where.phase = { in: input.phases };
  }
  if (input.domainKind) {
    where.domainKind = input.domainKind;
  }
  if (input.cursor) {
    const cursorJob = await findJobById(input.cursor);
    if (cursorJob) {
      where.AND = [
        {
          OR: [
            { createdAt: { lt: cursorJob.createdAt } },
            {
              createdAt: cursorJob.createdAt,
              id: { lt: cursorJob.id },
            },
          ],
        },
      ];
    }
  }

  const rows = (await prisma.processingJob.findMany({
    where: where as never,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.limit + 1,
  })) as unknown as ProcessingJob[];

  let nextCursor: string | null = null;
  if (rows.length > input.limit) {
    const overflow = rows.pop();
    if (overflow) {
      nextCursor = overflow.id;
    }
  }

  return { jobs: rows, nextCursor };
}

export async function deleteJobById(jobId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.processingJob.delete({ where: { id: jobId } });
}

export async function markFailed(jobId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.processingJob.update({
    where: { id: jobId },
    data: {
      phase: "failed",
      outcome: "failed",
      completedAt: new Date(),
    },
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
  const prisma = getPrisma();
  await prisma.processingJob.update({
    where: { id: jobId },
    data: {
      phase: "complete",
      outcome: result.outcome,
      processedCount: result.processedCount,
      errorCount: result.errorCount,
      completedAt: new Date(),
    },
  });
}

export async function getManifestByManifestId(manifestId: string): Promise<{
  manifestId: string;
  jobId: string;
  domainKind: string;
  sources: Record<string, ProcessingSource>;
  context?: Record<string, unknown>;
} | null> {
  const prisma = getPrisma();
  const manifest = await prisma.processingManifest.findUnique({
    where: { id: manifestId },
  });
  if (!manifest) {
    return null;
  }

  return {
    manifestId: manifest.id,
    jobId: manifest.jobId,
    domainKind: manifest.domainKind,
    sources: manifest.sources as unknown as Record<string, ProcessingSource>,
    context: manifest.context as Record<string, unknown> | undefined,
  };
}

export type { ProcessingJob, PrismaProcessingJob };
