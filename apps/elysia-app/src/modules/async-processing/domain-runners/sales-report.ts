import { readStreamToBuffer } from "../../import/plugins/tabular-xlsx/load-workbook-from-buffer.ts";
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
 * Demo runner for the `sales-report` domain.
 *
 * The nest version (`apps/nest-app/src/applications/sales-data/sales-import/`)
 * implemented full business logic: read 3 xlsx sheets, parse row cells,
 * validate via `mergeLineItemRow` / `indexInventoryRow` / `indexProductRow`,
 * then batch-insert merged rows into the Prisma `Member` table.
 *
 * That business logic + the validation helpers + the Prisma Member writes
 * are not ported yet. This runner demonstrates that the import plugin helpers
 * (xlsx loading, JSONL parsing, error scoping, throttled progress) are
 * available on Elysia and compile cleanly together with the async-processing
 * infrastructure. It reads each source's stream into a buffer to prove the
 * path works end-to-end, then returns `processedCount: 0`.
 *
 * To restore real business logic: port the validation helpers and the Prisma
 * Member writes, then replace this runner's body with the real logic.
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
      const source = sources.get(sourceId)!;
      if (source.verifiedLocator.kind !== "local") {
        throw new Error(
          `sales-report demo only supports local sources (got ${source.verifiedLocator.kind})`,
        );
      }
    }

    await io.onProgress({
      phase: "loading_source",
      detail: "reading source streams",
      percent: 10,
    });

    for (const sourceId of required) {
      const source = sources.get(sourceId)!;
      const locator = source.verifiedLocator;
      if (locator.kind !== "local") continue;
      const stream = (await io.openStream(source)) as unknown as Parameters<
        typeof readStreamToBuffer
      >[0];
      await readStreamToBuffer(stream);
    }

    await io.onProgress({
      phase: "validating_rows",
      detail: "stub: would merge line items with products + inventory here",
      percent: 75,
    });

    await io.onProgress({
      phase: "saving_database",
      detail: "stub: would batch-insert into Member table here",
      percent: 100,
    });

    return {
      outcome: "success",
      processedCount: 0,
      errorCount: 0,
    };
  },
};
