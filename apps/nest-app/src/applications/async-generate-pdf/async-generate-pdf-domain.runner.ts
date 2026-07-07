import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Injectable } from "@nestjs/common";
import type {
  DomainRunner,
  DomainRunnerIo,
  DomainRunResult,
  VerifiedProcessingSource,
} from "@/async-processing/async-processing.types";
import {
  ASYNC_GENERATE_PDF_DOMAIN_KIND,
  DEMO_STAGE_DELAY_MS,
} from "./async-generate-pdf.constants";
import { MOCK_INFO_ROWS } from "./async-generate-pdf.mock-data";
import type { AsyncGeneratePdfProgress } from "./async-generate-pdf.progress.types";
import {
  buildJobOutputFolderName,
  buildJobOutputFolderPath,
  buildJobOutputZipPath,
} from "./helpers/job-output-paths";
import {
  buildInvoicePdfBuffer,
  pdfFileNameFromEmail,
  saveInvoicePdfBuffer,
} from "./helpers/write-invoice-pdf";
import { removeDirectory, zipDirectory } from "./helpers/zip-output-folder";

function readStartedAtTimestampFromContext(
  context: Record<string, unknown> | undefined,
): number {
  const startedAtTimestamp = context?.startedAtTimestamp;
  if (
    typeof startedAtTimestamp !== "number" ||
    !Number.isFinite(startedAtTimestamp)
  ) {
    throw new Error("startedAtTimestamp is required in manifest context");
  }
  return startedAtTimestamp;
}

async function pauseForDemo(): Promise<void> {
  if (DEMO_STAGE_DELAY_MS <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, DEMO_STAGE_DELAY_MS));
}

async function reportProgress(
  onProgress: DomainRunnerIo["onProgress"],
  input: {
    phase: AsyncGeneratePdfProgress["phase"];
    email?: string;
    detail?: string;
    stepIndex: number;
    totalSteps: number;
  },
): Promise<void> {
  if (!onProgress) {
    return;
  }

  const event: AsyncGeneratePdfProgress = {
    phase: input.phase,
    email: input.email,
    detail: input.detail,
    processedCount: input.stepIndex,
    totalCount: input.totalSteps,
    percent: Math.min(
      100,
      Math.round((input.stepIndex / input.totalSteps) * 100),
    ),
  };
  await onProgress(event);
}

@Injectable()
export class AsyncGeneratePdfDomainRunner implements DomainRunner {
  readonly domainKind = ASYNC_GENERATE_PDF_DOMAIN_KIND;

  async run(
    jobId: string,
    _sources: Map<string, VerifiedProcessingSource>,
    io: DomainRunnerIo,
  ): Promise<DomainRunResult> {
    const startedAtTimestamp = readStartedAtTimestampFromContext(io.context);
    const outputBaseDir = join(process.cwd(), "temp", "async-generate-pdf");
    const outputDir = buildJobOutputFolderPath(
      outputBaseDir,
      startedAtTimestamp,
      jobId,
    );
    const zipFilePath = buildJobOutputZipPath(
      outputBaseDir,
      startedAtTimestamp,
      jobId,
    );
    const outputFolderName = buildJobOutputFolderName(
      startedAtTimestamp,
      jobId,
    );

    await mkdir(outputDir, { recursive: true });

    const rows = MOCK_INFO_ROWS;
    const totalSteps = rows.length * 2 + 2;
    let stepIndex = 0;

    for (const row of rows) {
      stepIndex += 1;
      await reportProgress(io.onProgress, {
        phase: "generating_pdf",
        email: row.email,
        stepIndex,
        totalSteps,
      });
      await pauseForDemo();

      const pdfBuffer = await buildInvoicePdfBuffer(row);

      stepIndex += 1;
      await reportProgress(io.onProgress, {
        phase: "saving_pdf",
        email: row.email,
        stepIndex,
        totalSteps,
      });
      await pauseForDemo();

      const pdfPath = join(outputDir, pdfFileNameFromEmail(row.email));
      await saveInvoicePdfBuffer(pdfPath, pdfBuffer);
    }

    stepIndex += 1;
    await reportProgress(io.onProgress, {
      phase: "zipping_pdfs",
      detail: `folder ${outputFolderName}`,
      stepIndex,
      totalSteps,
    });
    await pauseForDemo();
    await zipDirectory(outputDir, zipFilePath);

    stepIndex += 1;
    await reportProgress(io.onProgress, {
      phase: "removing_folder",
      detail: `folder ${outputFolderName}`,
      stepIndex,
      totalSteps,
    });
    await pauseForDemo();
    await removeDirectory(outputDir);

    return {
      outcome: "success",
      processedCount: rows.length,
      errorCount: 0,
    };
  }
}
