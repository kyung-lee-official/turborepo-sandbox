import { mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ActiveJobConflictError } from "@/async-processing/async-processing.types";
import { ProcessingOrchestratorService } from "@/async-processing/async-processing-core/processing-orchestrator.service";
import { PrismaService } from "@/recipes/prisma/prisma.service";
import { ASYNC_GENERATE_PDF_DOMAIN_KIND } from "./async-generate-pdf.constants";
import {
  type AsyncGeneratePdfInfoRow,
  MOCK_INFO_ROWS,
} from "./async-generate-pdf.mock-data";

export type GeneratedPdfFile = {
  name: string;
  sizeBytes: number;
};

export type StartAsyncGeneratePdfJobResult = {
  jobId: string;
  manifestId: string;
  outputDirName: string;
};

@Injectable()
export class AsyncGeneratePdfService {
  private readonly outputBaseDir = join(
    process.cwd(),
    "temp",
    "async-generate-pdf",
  );

  constructor(
    private readonly processingOrchestrator: ProcessingOrchestratorService,
    private readonly prisma: PrismaService,
  ) {}

  getOutputBaseDir(): string {
    return this.outputBaseDir;
  }

  listMockInfo(): AsyncGeneratePdfInfoRow[] {
    return MOCK_INFO_ROWS;
  }

  getTemplateInfo(): {
    module: string;
    outputBaseDir: string;
    domainKind: string;
    endpoints: string[];
  } {
    return {
      module: "async-generate-pdf",
      outputBaseDir: this.outputBaseDir,
      domainKind: ASYNC_GENERATE_PDF_DOMAIN_KIND,
      endpoints: [
        "GET /async-generate-pdf/info",
        "POST /async-generate-pdf/jobs",
        "GET /async-generate-pdf/jobs/:jobId/files",
        "GET /jobs/:jobId",
        "GET /jobs/:jobId/events",
      ],
    };
  }

  async startJob(): Promise<StartAsyncGeneratePdfJobResult> {
    const startedAtTimestamp = Date.now();
    await mkdir(this.outputBaseDir, { recursive: true });

    try {
      const result = await this.processingOrchestrator.startProcessing({
        domainKind: ASYNC_GENERATE_PDF_DOMAIN_KIND,
        sources: {},
        context: { startedAtTimestamp },
      });

      return {
        ...result,
        outputDirName: `${startedAtTimestamp}-${result.jobId}`,
      };
    } catch (error) {
      if (error instanceof ActiveJobConflictError) {
        throw new ConflictException({
          code: "PROCESSING_ACTIVE_JOB",
          message: `A processing job is already active for domainKind ${ASYNC_GENERATE_PDF_DOMAIN_KIND}`,
        });
      }
      throw error;
    }
  }

  async listJobOutputFiles(jobId: string): Promise<{
    outputDir: string;
    files: GeneratedPdfFile[];
  }> {
    const outputDir = await this.resolveOutputDirForJob(jobId);
    await mkdir(outputDir, { recursive: true });

    const entries = await readdir(outputDir, { withFileTypes: true });
    const pdfEntries = entries.filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"),
    );

    const files = await Promise.all(
      pdfEntries.map(async (entry) => {
        const filePath = join(outputDir, entry.name);
        const fileStat = await stat(filePath);
        return {
          name: entry.name,
          sizeBytes: fileStat.size,
        };
      }),
    );

    return { outputDir, files };
  }

  private async resolveOutputDirForJob(jobId: string): Promise<string> {
    const manifest = await this.prisma.client.processingManifest.findUnique({
      where: { jobId },
    });
    if (!manifest) {
      throw new NotFoundException(
        `Processing manifest not found for job: ${jobId}`,
      );
    }

    const context = manifest.context as Record<string, unknown> | null;
    const startedAtTimestamp = context?.startedAtTimestamp;
    if (
      typeof startedAtTimestamp !== "number" ||
      !Number.isFinite(startedAtTimestamp)
    ) {
      throw new NotFoundException(
        `Output directory context is missing for job: ${jobId}`,
      );
    }

    return join(this.outputBaseDir, `${startedAtTimestamp}-${jobId}`);
  }
}
