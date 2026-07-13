# Layer 4: Domain Business Layer

The domain layer is where actual business work happens. It receives verified sources from the async-processing core, parses them with any needed plugins, validates business rules, persists valid data, emits domain progress, and returns a `DomainRunResult`.

## Boundary

```text
VerifiedProcessingSource map + DomainRunnerIo
  -> load source streams
  -> parse format
  -> validate business rules
  -> persist valid data
  -> collect non-critical errors
  -> DomainRunResult
```

The domain layer does not start jobs. It runs because the core selected its registered `DomainRunner`.

**Greenfield rule:** numbered flows in this chapter describe behavior. **Implementation pattern** blocks show the required code shape. Domains live in dedicated modules per `domainKind`; runners do not start jobs, acquire locks, verify locators, or format HTTP error downloads.

## Domain Registration

Domains register with `DomainRegistry` during module bootstrap.

```ts
domainRegistry.register("catalog-import", {
  domainRunner: catalogImportRunner,
  sourceSpecs: [
    { sourceId: "primaryData", required: true },
    { sourceId: "referenceData", required: false },
  ],
  lockPolicy: { type: "global_singleton" },
  upload: {
    allowedMimeBySourceId: {
      primaryData: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
      ],
      referenceData: [
        "application/x-ndjson",
        "application/json",
        "application/octet-stream",
      ],
    },
  },
});
```

Registration is the domain's public contract:

- Which `sourceId` values are required.
- Whether concurrent jobs are allowed.
- Which upload MIME types are accepted.
- Which runner performs the business work.

## Domain Runner Contract

The core invokes a registered `DomainRunner` with `DomainRunnerIo`. The core owns `openStream` because the core owns verified locators. Types: [Appendix B](../appendix-b-shared-types/README.md).

```typescript
type DomainRunner = {
  domainKind: string;
  run(
    jobId: string,
    sources: Map<string, VerifiedProcessingSource>,
    io: DomainRunnerIo,
  ): Promise<DomainRunResult>;
};
```

Parse `io.context` with a domain-owned Zod schema at the start of `run`. Schema copies: [Appendix D](../appendix-d-validation-schemas/README.md).

### Implementation pattern: domain context schema

Each `domainKind` defines its own context schema. Copy [domain-context.schema.example.ts](../appendix-d-validation-schemas/04-domain-business-layer/domain-context.schema.example.ts) per domain.

```typescript
import { z } from "zod";

export const catalogImportContextSchema = z.object({
  importBatchId: z.string().min(1),
  defaultCurrency: z.string().length(3).optional(),
});

export type CatalogImportContext = z.infer<typeof catalogImportContextSchema>;
```

At the top of `run`:

```typescript
const context = catalogImportContextSchema.parse(io.context ?? {});
```

## Domain Result

Return `DomainRunResult` with `success` or `validation_failed`. Use `validation_failed` for row-level or record-level non-critical errors where valid records were still processed. Throw only for critical failures that should mark the whole job as failed.

```typescript
// All rows valid
return {
  outcome: "success",
  processedCount: savedCount,
  errorCount: 0,
};

// Some rows invalid, valid rows persisted
return {
  outcome: "validation_failed",
  processedCount: savedCount,
  errorCount: errors.length,
  errors,
};
```

The worker persists `errors` when `outcome` is `validation_failed`. Clients download them through the Layer 3 errors endpoint (`buildProcessingJobErrorsJsonl` in [import-shared.md](../05-import-plugin-support-layer/import-shared.md)).

## Business Error Collection

Collect `ErrorDetail` values in memory during the domain run and return them with `validation_failed`. The worker persists them after the runner returns.

| Error kind              | Action                                      |
| ----------------------- | ------------------------------------------- |
| Parse-time (plugin)     | `pushError` handler scopes into `errors[]`  |
| Business rule failure   | Domain appends scoped `ErrorDetail`         |
| Critical source missing | `throw` — whole job becomes `failed`        |
| Critical corrupt file   | `throw` when recovery is not possible       |

Use `scopeTabularError` for XLSX sources and `scopeJsonlError` for JSONL sources so `sourceId`, `originalName`, and `worksheetName` (tabular only) are set consistently.

## Domain Progress

Domain progress uses `DomainProcessingPhase` values (`loading_source`, `validating_rows`, `saving_database`). See [Appendix B](../appendix-b-shared-types/README.md).

Use immediate progress for source loading and throttled progress for row validation or database writes. Helpers: [import-shared.md](../05-import-plugin-support-layer/import-shared.md). Throttle interval: `DOMAIN_PROGRESS_THROTTLE_MS` in [Appendix C](../appendix-c-constants/README.md). Inside the interval, the reporter schedules a trailing emit with the latest counts instead of dropping updates.

Example progress payload:

```ts
{
  phase: "validating_rows",
  sourceId: "primaryData",
  originalName: "data.xlsx",
  totalCount: 10000,
  processedCount: 5200,
  validCount: 5100,
  errorCount: 100,
  percent: 52
}
```

Call `flush` on the throttled reporter at the end of each phase so the final counts reach clients.

## Using Plugins Inside the Domain

Format plugins are helpers, not orchestrators. They are documented separately. Cross-format helpers (`ErrorDetail`, domain progress, error export): [import-shared.md](../05-import-plugin-support-layer/import-shared.md).

| Format           | Guide                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| Tabular XLSX     | [xlsx.md](../05-import-plugin-support-layer/xlsx.md)                   |
| JSONL            | [jsonl.md](../05-import-plugin-support-layer/jsonl.md)                 |
| Shared utilities | [import-shared.md](../05-import-plugin-support-layer/import-shared.md) |

Typical XLSX flow:

1. Get `source = sources.get("primaryData")`.
2. `stream = await io.openStream(source)`.
3. Use the [tabular XLSX plugin](../05-import-plugin-support-layer/xlsx.md) to load the workbook and parse sheet rows.
4. In `onRow`, apply business validation and persistence.
5. Scope business errors with `scopeTabularError` into the shared `errors[]` array.
6. Return `success` or `validation_failed`.

Typical JSONL flow:

1. Get `source = sources.get("referenceData")`.
2. `stream = await io.openStream(source)`.
3. Use the [JSONL plugin](../05-import-plugin-support-layer/jsonl.md) to parse line-delimited JSON.
4. In `onLine`, apply business validation or build lookup indexes.
5. Scope business errors with `scopeJsonlError` into `errors[]`.
6. Merge into the same `errors[]` the XLSX path uses.

The **Implementation pattern** blocks below wire these steps together for a fictional `catalog-import` domain.

### Implementation pattern: `DomainRunner.run` (primary XLSX source)

Pedagogical example — one required XLSX source (`primaryData`). Replace business rules and persistence with your domain logic.

```typescript
import { Injectable } from "@nestjs/common";
import { loadWorkbookFromStream } from "import/plugins/tabular-xlsx/load-workbook-from-stream";
import { parseSheetRows } from "import/plugins/tabular-xlsx/parse-sheet-rows";
import { scopeTabularError } from "import/plugins/tabular-xlsx/scope-tabular-errors";
import { createThrottledDomainProgressReporter } from "import/shared/create-throttled-domain-progress";
import type { ErrorDetail } from "import/shared/import-error.types";
import { reportDomainProgress } from "import/shared/report-domain-progress";
import {
  catalogImportContextSchema,
  type CatalogImportContext,
} from "./catalog-import-context.schema";
import {
  CATALOG_IMPORT_DOMAIN_KIND,
  CATALOG_IMPORT_SOURCE_IDS,
  catalogImportSheetSpec,
} from "./catalog-import.constants";
import type { CatalogRepository } from "./catalog.repository";

type CatalogRow = { sku: string; name: string };

@Injectable()
export class CatalogImportDomainRunner implements DomainRunner {
  readonly domainKind = CATALOG_IMPORT_DOMAIN_KIND;

  constructor(private readonly catalogRepository: CatalogRepository) {}

  async run(
    jobId: string,
    sources: Map<string, VerifiedProcessingSource>,
    io: DomainRunnerIo,
  ): Promise<DomainRunResult> {
    const context: CatalogImportContext = catalogImportContextSchema.parse(
      io.context ?? {},
    );

    const primaryData = sources.get(CATALOG_IMPORT_SOURCE_IDS.primaryData);
    if (!primaryData) {
      throw new Error("Missing required source: primaryData");
    }

    const errors: ErrorDetail[] = [];
    const validRows: CatalogRow[] = [];

    await reportDomainProgress(
      io.onProgress,
      "loading_source",
      primaryData.sourceId,
      { originalName: primaryData.label },
    );

    const stream = await io.openStream(primaryData);
    const workbook = await loadWorkbookFromStream(stream);

    const parseCtx = {
      sourceId: primaryData.sourceId,
      label: primaryData.label,
    };

    const tabularScope = {
      sourceId: primaryData.sourceId,
      originalName: primaryData.label,
      worksheetName: catalogImportSheetSpec.sheetName,
    };

    await parseSheetRows(workbook, catalogImportSheetSpec, parseCtx, {
      onRow: ({ rowNumber, cells }) => {
        const sku = cells.SKU ?? "";
        const name = cells.Name ?? "";
        const message = validateCatalogRow({ sku, name }, context);
        if (message) {
          errors.push(
            scopeTabularError(
              {
                message,
                rowNumber,
                rawData: JSON.stringify(cells),
              },
              tabularScope,
            ),
          );
          return;
        }
        validRows.push({ sku, name });
      },
      pushError: (detail) => {
        errors.push(scopeTabularError(detail, tabularScope));
      },
    });

    const saveReporter = createThrottledDomainProgressReporter(
      io.onProgress,
      "saving_database",
      primaryData.sourceId,
      {
        originalName: primaryData.label,
        worksheetName: catalogImportSheetSpec.sheetName,
      },
    );

    let savedCount = 0;
    for (let index = 0; index < validRows.length; index += 1) {
      const row = validRows[index]!;
      await this.catalogRepository.saveRow({
        jobId,
        importBatchId: context.importBatchId,
        sku: row.sku,
        name: row.name,
      });
      savedCount += 1;
      await saveReporter.report({
        processedCount: index + 1,
        totalCount: validRows.length,
        validCount: savedCount,
        errorCount: errors.length,
      });
    }
    await saveReporter.flush({
      processedCount: validRows.length,
      totalCount: validRows.length,
      validCount: savedCount,
      errorCount: errors.length,
    });

    if (errors.length > 0) {
      return {
        outcome: "validation_failed",
        processedCount: savedCount,
        errorCount: errors.length,
        errors,
      };
    }

    return {
      outcome: "success",
      processedCount: savedCount,
      errorCount: 0,
    };
  }
}

function validateCatalogRow(
  row: { sku: string; name: string },
  context: CatalogImportContext,
): string | undefined {
  if (!row.sku) return "SKU is required";
  if (!/^[A-Z0-9-]+$/.test(row.sku)) return "SKU must be uppercase alphanumeric";
  if (!row.name) return "Name is required";
  if (!context.importBatchId) return "importBatchId is required";
  return undefined;
}
```

Supporting constants and sheet spec:

```typescript
export const CATALOG_IMPORT_DOMAIN_KIND = "catalog-import" as const;

export const CATALOG_IMPORT_SOURCE_IDS = {
  primaryData: "primaryData",
  referenceData: "referenceData",
} as const;

export const catalogImportSheetSpec = {
  sheetName: "Catalog",
  headers: ["SKU", "Name"] as const,
};
```

`CatalogRepository.saveRow` is a domain-owned persistence boundary — inject Prisma, a REST client, or an in-memory stub in tests. The runner does not call job APIs.

### Implementation pattern: optional JSONL reference source

When registration marks a source as optional (`required: false`), skip it when `sources.get` returns `undefined`. When present, load it before the primary source if downstream validation needs a lookup built from JSONL lines.

```typescript
import { parseJsonlLines } from "import/plugins/jsonl/parse-jsonl-lines";
import { scopeJsonlError } from "import/plugins/jsonl/scope-jsonl-errors";

const aliasBySku = new Map<string, string>();

const referenceData = sources.get(CATALOG_IMPORT_SOURCE_IDS.referenceData);
if (referenceData) {
  await reportDomainProgress(
    io.onProgress,
    "loading_source",
    referenceData.sourceId,
    { originalName: referenceData.label },
  );

  const referenceStream = await io.openStream(referenceData);
  const jsonlScope = {
    sourceId: referenceData.sourceId,
    originalName: referenceData.label,
  };

  await parseJsonlLines(referenceStream, jsonlScope, {
    onLine: ({ rowNumber, record }) => {
      const sku = typeof record.sku === "string" ? record.sku : "";
      const alias = typeof record.alias === "string" ? record.alias : "";
      if (!sku || !alias) {
        errors.push(
          scopeJsonlError(
            {
              message: "sku and alias are required",
              rowNumber,
              rawData: JSON.stringify(record),
            },
            jsonlScope,
          ),
        );
        return;
      }
      aliasBySku.set(sku, alias);
    },
    pushError: (detail) => {
      errors.push(scopeJsonlError(detail, jsonlScope));
    },
  });
}

// In the XLSX onRow handler, resolve display name:
// const displayName = aliasBySku.get(sku) ?? name;
```

Plugin call sites only — see [jsonl.md](../05-import-plugin-support-layer/jsonl.md) for `parseJsonlLines` behavior.

### Implementation pattern: module layout and registration

```text
applications/catalog-import/
  catalog-import.constants.ts
  catalog-import-context.schema.ts
  catalog-import-domain.runner.ts
  catalog.repository.ts              # domain persistence port
  catalog-import.module.ts
```

```typescript
import type { OnModuleInit } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { AsyncProcessingModule } from "async-processing/async-processing.module";
import { DomainRegistry } from "async-processing/async-processing-core/domain-registry.service";
import {
  CATALOG_IMPORT_DOMAIN_KIND,
  catalogImportSourceSpecs,
  catalogImportUploadPolicy,
} from "./catalog-import.constants";
import { CatalogImportDomainRunner } from "./catalog-import-domain.runner";
import { CatalogRepository } from "./catalog.repository";

@Module({
  imports: [AsyncProcessingModule],
  providers: [CatalogImportDomainRunner, CatalogRepository],
})
export class CatalogImportModule implements OnModuleInit {
  constructor(
    private readonly domainRegistry: DomainRegistry,
    private readonly catalogImportDomainRunner: CatalogImportDomainRunner,
  ) {}

  onModuleInit(): void {
    this.domainRegistry.register(CATALOG_IMPORT_DOMAIN_KIND, {
      domainRunner: this.catalogImportDomainRunner,
      sourceSpecs: [...catalogImportSourceSpecs],
      lockPolicy: { type: "global_singleton" },
      upload: catalogImportUploadPolicy,
    });
  }
}
```

```typescript
export const catalogImportSourceSpecs = [
  { sourceId: CATALOG_IMPORT_SOURCE_IDS.primaryData, required: true },
  { sourceId: CATALOG_IMPORT_SOURCE_IDS.referenceData, required: false },
] as const;

export const catalogImportUploadPolicy = {
  allowedMimeBySourceId: {
    [CATALOG_IMPORT_SOURCE_IDS.primaryData]: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ],
    [CATALOG_IMPORT_SOURCE_IDS.referenceData]: [
      "application/x-ndjson",
      "application/json",
      "application/octet-stream",
    ],
  },
} as const;
```

Import `CatalogImportModule` from the application root module. The runner injects domain dependencies only — not `ProcessingOrchestratorService`, `DomainRegistry`, or upload stores.

## Persistence Strategy

The domain owns business persistence. It should:

- Persist valid rows even when invalid rows exist.
- Avoid wrapping the whole import in one transaction if row-level `validation_failed` is required.
- Use per-row or per-batch transactions when appropriate.
- Make writes idempotent when jobs might be retried manually.

In the `catalog-import` pattern above, valid rows are collected during parse, then saved in a loop with throttled `saving_database` progress. Swap the loop for batch inserts when volume requires it.

## Rules and Anti-Patterns

| Anti-pattern                                      | Why                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| Runner calls `startProcessing`                    | Layer 2 adapters own job creation                                   |
| Runner verifies locators or deletes upload blobs  | Layer 3 worker owns verification and cleanup                        |
| Runner acquires `ActiveJobLock`                   | Layer 3 orchestrator owns lock policy                               |
| One transaction around the entire import          | Blocks persisting valid rows when some rows fail validation         |
| Re-trim strings already trimmed at plugin ingest  | Breaks map lookup on stored literals                                |
| Inline ExcelJS or JSONL parsing in the runner     | Use [xlsx.md](../05-import-plugin-support-layer/xlsx.md) / [jsonl.md](../05-import-plugin-support-layer/jsonl.md) plugins |
| Return HTTP responses or error files from `run`   | Return `DomainRunResult`; Layer 3 persists and serves NDJSON errors |
| Duplicate `sourceSpecs` outside registration      | `DomainRegistry` registration is the single contract                |
| Swallow critical failures as `validation_failed`  | Missing required source or corrupt workbook should `throw`          |

## Domain Invariants

- Domain code lives in a dedicated module per `domainKind`.
- Domain modules register with `DomainRegistry`.
- Domain code does not create processing jobs.
- Domain code does not acquire active locks.
- Domain code does not verify locators.
- Domain code does not delete upload locators.
- Domain code owns business schemas and rules.
- Domain code owns valid-data persistence.
- Domain returns structured errors, not error files.

## Checklist

**New domain runner:**

```text
- [ ] Domain Zod schema for io.context (Appendix D pattern)
- [ ] Register domainKind + sourceSpecs + lockPolicy + upload MIME map on module init
- [ ] run(): parse context, guard required sources (throw), init errors[]
- [ ] reportDomainProgress loading_source per source opened
- [ ] Plugin call sites only — loadWorkbookFromStream / parseSheetRows / parseJsonlLines
- [ ] Scope errors with scopeTabularError or scopeJsonlError
- [ ] Throttled progress for saving_database (or validating_rows when split from parse)
- [ ] flush throttled reporter at phase end (trailing timer cancelled, final percent)
- [ ] Return success vs validation_failed DomainRunResult
- [ ] Throw only for critical failures
- [ ] Runner injects domain deps only — not orchestrator or registry
```

**Optional multi-source:**

```text
- [ ] Optional sources: skip when sources.get returns undefined
- [ ] Load reference or lookup sources before primary validation when order matters
- [ ] One shared errors[] array across all sources in the run
```
