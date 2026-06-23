import { Injectable } from "@nestjs/common";
import type { Prisma } from "@repo/database";
import type { ErrorDetail } from "@/import/shared/import-error.types";
import { PrismaService } from "../../recipes/prisma/prisma.service";

const INSERT_BATCH_SIZE = 1000;

@Injectable()
export class ProcessingJobErrorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createManyFromErrors(
    processingJobId: string,
    errors: readonly ErrorDetail[],
  ): Promise<void> {
    if (errors.length === 0) {
      return;
    }

    for (let offset = 0; offset < errors.length; offset += INSERT_BATCH_SIZE) {
      const batch = errors.slice(offset, offset + INSERT_BATCH_SIZE);
      await this.prisma.client.processingJobError.createMany({
        data: batch.map((error, batchIndex) => ({
          processingJobId,
          sequence: offset + batchIndex + 1,
          payload: error as Prisma.InputJsonValue,
        })),
      });
    }
  }

  async listPayloadsByJobId(processingJobId: string): Promise<ErrorDetail[]> {
    const rows = await this.prisma.client.processingJobError.findMany({
      where: { processingJobId },
      orderBy: { sequence: "asc" },
      select: { payload: true },
    });
    return rows.map((row) => row.payload as ErrorDetail);
  }
}
