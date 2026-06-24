---
name: import-shared
description: >-
  Shared import layer — ErrorDetail, domain progress, validation error XLSX export,
  job error NDJSON. Used by format plugins, domain runners, and async-processing.
---

# Import shared layer

Cross-format utilities under **`apps/nest-app/src/import/shared/`** (no barrel **`index.ts`** — import concrete files).

| Owns | Format plugins own | Domain runners own |
| --- | --- | --- |
| **`ErrorDetail`**, progress helpers | Parse rows/lines, plugin-phase progress | Business rules, **`DomainRunResult`**, persistence |
| **`buildValidationErrorXlsxBuffer`** (optional client export) | Scoped parse errors | **`loading_source`**, **`validating_rows`**, **`saving_database`** |
| **`buildProcessingJobErrorsJsonl`** | | Collect **`errors[]` for worker |

Worker persists errors via **`ProcessingJobErrorRepository`** — domain returns **`errors: ErrorDetail[]`**, not blobs. Download: **`GET jobs/:jobId/errors`** ([async-processing](../async-processing/SKILL.md)).

---

## Types

```typescript
type ErrorDetail = {
  message: string;
  sourceId?: string;
  originalName?: string;
  worksheetName?: string; // tabular only
  rowNumber?: number;
  rawData?: string;
};

type DomainProcessingPhase =
  | "loading_source"
  | "validating_rows"
  | "saving_database";

type DomainProcessingProgress = {
  phase: DomainProcessingPhase;
  sourceId: string;
  originalName?: string;
  worksheetName?: string;
  totalCount?: number;
  processedCount?: number;
  validCount?: number;
  errorCount?: number;
  percent?: number;
};
```

---

## Implementation patterns

```typescript
// report-domain-progress.ts — immediate emit (use for loading_source)
export async function reportDomainProgress(
  onProgress: ((detail: unknown) => Promise<void>) | undefined,
  phase: DomainProcessingPhase,
  sourceId: string,
  options?: Partial<Omit<DomainProcessingProgress, "phase" | "sourceId">>,
): Promise<void> {
  if (!onProgress) return;
  await onProgress({ phase, sourceId, ...options });
}

// create-throttled-domain-progress.ts — validating_rows / saving_database (~1s)
export function createThrottledDomainProgressReporter(
  onProgress,
  phase: "validating_rows" | "saving_database",
  sourceId: string,
  context?: { originalName?: string; worksheetName?: string },
) {
  let lastAt = 0;
  return {
    async report(counts: { processedCount; totalCount; validCount?; errorCount? }) {
      const now = Date.now();
      if (now - lastAt < 1000 && counts.processedCount < counts.totalCount) return;
      lastAt = now;
      await reportDomainProgress(onProgress, phase, sourceId, { ...context, ...counts });
    },
  };
}
```

```typescript
// DomainRunResult on validation_failed — worker persists errors; no errorBlob
return {
  outcome: "validation_failed",
  processedCount: validCount,
  errorCount: errors.length,
  errors,
};
```

```typescript
// build-processing-job-errors-jsonl.ts — used by ProcessingController
export function buildProcessingJobErrorsJsonl(options: {
  jobId: string;
  domainKind: string;
  errorCount: number;
  errors: readonly ErrorDetail[];
}): string {
  const header = { kind: "header", jobId: options.jobId, domainKind: options.domainKind, errorCount: options.errorCount };
  return [JSON.stringify(header), ...options.errors.map((e) => JSON.stringify(e))].join("\n") + "\n";
}
```

```typescript
// build-validation-error-xlsx.ts — optional; not stored by worker by default
export async function buildValidationErrorXlsxBuffer(errors: readonly ErrorDetail[]): Promise<Buffer> {
  // columns: Source, Original Name, Worksheet, Row Number, Message, Raw Data
  // applyDefaultExportedSheetView(worksheet, columnCount) on error sheet
}
```

```typescript
// apply-exported-sheet-view.ts — freeze row 1 + autoFilter on exported data sheets
export function applyDefaultExportedSheetView(worksheet: ExcelJS.Worksheet, columnCount?: number): void {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnCount ?? worksheet.columnCount } };
}
```

---

## Files

```text
import/shared/
  import-error.types.ts
  domain-processing.types.ts
  report-domain-progress.ts
  create-throttled-domain-progress.ts
  percent-from-counts.ts
  build-validation-error-xlsx.ts
  build-processing-job-errors-jsonl.ts
  apply-exported-sheet-view.ts
```

---

## Related skills

| Task | Skill |
| --- | --- |
| XLSX / JSONL parse | `import-plugin-tabular-xlsx` / `import-plugin-jsonl` |
| Worker, errors API | `async-processing` |
| Domain business logic | Domain README (e.g. `applications/sales-data/sales-import/README.md`) |
