import { Injectable } from "@nestjs/common";
import type { Prisma } from "@repo/database";
import { PrismaService } from "../../recipes/prisma/prisma.service";
import type {
  ProcessingJob,
  ProcessingOutcome,
  ProcessingPhase,
  ProcessingSource,
} from "../async-processing.types";

@Injectable()
export class ProcessingJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createQueued(input: {
    jobId: string;
    domainKind: string;
    manifestId: string;
    sources: Record<string, ProcessingSource>;
    context?: Record<string, unknown>;
  }): Promise<ProcessingJob> {
    return this.prisma.client.$transaction(async (tx) => {
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
          sources: input.sources as Prisma.InputJsonValue,
          context: input.context as Prisma.InputJsonValue | undefined,
        },
      });

      return job;
    });
  }

  async claimProcessingPhase(jobId: string): Promise<boolean> {
    const result = await this.prisma.client.processingJob.updateMany({
      where: { id: jobId, phase: "queued" },
      data: { phase: "processing" },
    });
    return result.count === 1;
  }

  async finalize(
    jobId: string,
    patch: {
      phase: "complete" | "failed";
      outcome?: ProcessingOutcome;
      processedCount?: number;
      errorCount?: number;
      completedAt: Date;
    },
  ): Promise<void> {
    await this.prisma.client.processingJob.update({
      where: { id: jobId },
      data: patch,
    });
  }

  async findById(jobId: string): Promise<ProcessingJob | null> {
    return this.prisma.client.processingJob.findUnique({
      where: { id: jobId },
    });
  }

  async findMany(input: {
    phases?: ProcessingPhase[];
    domainKind?: string;
    limit: number;
    cursor?: string;
  }): Promise<{ jobs: ProcessingJob[]; nextCursor: string | null }> {
    const where: Prisma.ProcessingJobWhereInput = {};

    if (input.phases?.length) {
      where.phase = { in: input.phases };
    }
    if (input.domainKind) {
      where.domainKind = input.domainKind;
    }

    if (input.cursor) {
      const cursorJob = await this.findById(input.cursor);
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

    const rows = await this.prisma.client.processingJob.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
    });

    let nextCursor: string | null = null;
    if (rows.length > input.limit) {
      const overflow = rows.pop();
      nextCursor = overflow?.id ?? null;
    }

    return { jobs: rows, nextCursor };
  }

  async deleteById(jobId: string): Promise<void> {
    await this.prisma.client.processingJob.delete({
      where: { id: jobId },
    });
  }

  async getManifestByManifestId(manifestId: string): Promise<{
    manifestId: string;
    jobId: string;
    domainKind: string;
    sources: Record<string, ProcessingSource>;
    context?: Record<string, unknown>;
  } | null> {
    const manifest = await this.prisma.client.processingManifest.findUnique({
      where: { id: manifestId },
    });
    if (!manifest) {
      return null;
    }

    return {
      manifestId: manifest.id,
      jobId: manifest.jobId,
      domainKind: manifest.domainKind,
      sources: manifest.sources as Record<string, ProcessingSource>,
      context: manifest.context as Record<string, unknown> | undefined,
    };
  }
}
