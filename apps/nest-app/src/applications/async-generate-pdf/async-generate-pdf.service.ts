import { access, mkdir, stat } from "node:fs/promises";
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
  AUDIT_ENTRIES_PER_INVOICE,
  LINE_ITEMS_PER_INVOICE,
  MOCK_INFO_ROWS,
  MOCK_INVOICE_COUNT,
} from "./async-generate-pdf.mock-data";

export type MockInfoSummaryRow = {
  name: string;
  email: string;
  age: number;
  gender: string;
  invoiceDate: string;
  lineItemCount: number;
  auditEntryCount: number;
};

export type MockInfoResponse = {
  meta: {
    invoiceCount: number;
    lineItemsPerInvoice: number;
    auditEntriesPerInvoice: number;
  };
  rows: MockInfoSummaryRow[];
};

import {
  buildJobOutputFolderName,
  buildJobOutputZipPath,
} from "./helpers/job-output-paths";

export type JobOutputFile = {
  name: string;
  sizeBytes: number;
};

export type StartAsyncGeneratePdfJobResult = {
  jobId: string;
  manifestId: string;
  outputDirName: string;
  zipFileName: string;
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

  listMockInfo(): MockInfoResponse {
    return {
      meta: {
        invoiceCount: MOCK_INVOICE_COUNT,
        lineItemsPerInvoice: LINE_ITEMS_PER_INVOICE,
        auditEntriesPerInvoice: AUDIT_ENTRIES_PER_INVOICE,
      },
      rows: MOCK_INFO_ROWS.map(({ lineItems, auditEntries, ...row }) => ({
        ...row,
        lineItemCount: lineItems.length,
        auditEntryCount: auditEntries.length,
      })),
    };
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

      const outputDirName = buildJobOutputFolderName(
        startedAtTimestamp,
        result.jobId,
      );

      return {
        ...result,
        outputDirName,
        zipFileName: `${outputDirName}.zip`,
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
    outputBaseDir: string;
    zipFile: JobOutputFile | null;
  }> {
    const { startedAtTimestamp } = await this.readJobOutputContext(jobId);
    const zipFilePath = buildJobOutputZipPath(
      this.outputBaseDir,
      startedAtTimestamp,
      jobId,
    );

    try {
      await access(zipFilePath);
    } catch {
      return { outputBaseDir: this.outputBaseDir, zipFile: null };
    }

    const zipStat = await stat(zipFilePath);
    return {
      outputBaseDir: this.outputBaseDir,
      zipFile: {
        name: `${buildJobOutputFolderName(startedAtTimestamp, jobId)}.zip`,
        sizeBytes: zipStat.size,
      },
    };
  }

  private async readJobOutputContext(jobId: string): Promise<{
    startedAtTimestamp: number;
  }> {
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

    return { startedAtTimestamp };
  }
}
