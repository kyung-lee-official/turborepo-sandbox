import type {
  DomainRunner,
  DomainRunnerIo,
  DomainRunResult,
  VerifiedProcessingSource,
} from "../types.ts";

export const SALES_REPORT_DOMAIN_KIND = "sales-report" as const;

export const SALES_REPORT_SOURCE_IDS = {
  salesData: "salesData",
  inventory: "inventory",
  productDescriptions: "productDescriptions",
} as const;

export const salesReportSourceSpecs = [
  { sourceId: SALES_REPORT_SOURCE_IDS.salesData, required: true },
  { sourceId: SALES_REPORT_SOURCE_IDS.inventory, required: true },
  { sourceId: SALES_REPORT_SOURCE_IDS.productDescriptions, required: true },
] as const;

/**
 * Stub domain runner for the `sales-report` domain. Emits progress events and
 * returns success without doing real work.
 *
 * Real parsing + validation + DB writes (Excel + JSONL via exceljs, Prisma
 * Member table inserts) live in the nest version
 * (`apps/nest-app/src/applications/sales-data/sales-import/`). The elysia version
 * exists to make the async-processing flow work end-to-end so the
 * `import-sales-test-fixtures` page can submit jobs and observe progress.
 *
 * To restore real business logic: port the import plugin layer (jsonl parser,
 * xlsx parser, error scoping, throttled progress) and the validation helpers,
 * then replace this stub's body with the real domain runner logic.
 */
export const salesReportDomainRunner: DomainRunner = {
  domainKind: SALES_REPORT_DOMAIN_KIND,

  async run(
    jobId: string,
    sources: Map<string, VerifiedProcessingSource>,
    io: DomainRunnerIo,
  ): Promise<DomainRunResult> {
    const required = [
      SALES_REPORT_SOURCE_IDS.salesData,
      SALES_REPORT_SOURCE_IDS.inventory,
      SALES_REPORT_SOURCE_IDS.productDescriptions,
    ];
    for (const sourceId of required) {
      if (!sources.has(sourceId)) {
        throw new Error(`Missing required source: ${sourceId}`);
      }
    }

    await io.onProgress({
      phase: "loading_source",
      detail: "stub: would parse xlsx + jsonl here",
      percent: 50,
    });
    await io.onProgress({
      phase: "saving_database",
      detail: "stub: would write to Member table here",
      percent: 100,
    });

    return {
      outcome: "success",
      processedCount: 0,
      errorCount: 0,
    };
  },
};
