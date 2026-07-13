# Import Shared Utilities

Cross-format utilities under `import/shared/`. Format plugins ([xlsx.md](./xlsx.md), [jsonl.md](./jsonl.md)) import concrete files from here — especially `ErrorDetail`. Plugins do not import each other.

Types: [`import-shared.types.ts`](../appendix-b-shared-types/05-import-plugin-support-layer/import-shared.types.ts), [`domain-progress.types.ts`](../appendix-b-shared-types/04-domain-business-layer/domain-progress.types.ts) in Appendix B.

**Greenfield rule:** this folder holds types and helpers used by **multiple** import paths. XLSX-only or JSONL-only parse logic stays in the plugin guides.

## Scope

| `import/shared` owns                               | Format plugins own                                           | Domain runners own                                     |
| -------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| `ErrorDetail`, NDJSON header type                  | Parse rows/lines, plugin-phase progress                      | Business rules, `DomainRunResult`, persistence         |
| `reportDomainProgress`, throttled reporter         | Scoped parse errors (`scopeTabularError`, `scopeJsonlError`) | `loading_source`, `validating_rows`, `saving_database` |
| `buildProcessingJobErrorsJsonl`                    |                                                              | Collect `errors[]` for worker                          |
| `buildValidationErrorXlsxBuffer` (optional export) |                                                              |                                                        |
| `applyDefaultExportedSheetView`                    |                                                              |                                                        |

### Must not

- ExcelJS workbook parsing or JSONL line splitting — see plugin guides.
- BullMQ, Redis, `domainKind`, Prisma, or `startProcessing`.
- Barrel `index.ts` re-exports.

## ErrorDetail

The shared error row shape for plugins, domains, and the worker.

```typescript
type ErrorDetail = {
  message: string;
  sourceId?: string;
  originalName?: string;
  worksheetName?: string; // tabular only — omit for JSONL
  rowNumber?: number; // 1-based row or physical line
  rawData?: string;
};
```

### Field conventions

| Field           | XLSX                              | JSONL                                 | Set by                                          |
| --------------- | --------------------------------- | ------------------------------------- | ----------------------------------------------- |
| `message`       | Required                          | Required                              | Plugin or domain                                |
| `sourceId`      | Scoped from parse context         | Scoped from parse context             | Plugin scoping helper or explicit               |
| `originalName`  | From `source.label`               | From `source.label`                   | Scoping helper                                  |
| `worksheetName` | From `TabularSheetSpec.sheetName` | **Omit**                              | `scopeTabularError` only — [xlsx.md](./xlsx.md) |
| `rowNumber`     | 1-based Excel row                 | 1-based physical line                 | Plugin or domain                                |
| `rawData`       | Optional audit dump               | Line text or `JSON.stringify(record)` | Plugin or domain                                |

Domain `onRow` / `onLine` handlers receive strings **as trimmed at ingest** — do not re-trim when validating.

### Who creates errors

| Error kind                            | Owner                                                            | Scoped with                           |
| ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------- |
| Bad worksheet, headers, or cell shape | [XLSX plugin](./xlsx.md)                                         | `scopeTabularError`                   |
| Invalid JSON or non-object line       | [JSONL plugin](./jsonl.md)                                       | `scopeJsonlError`                     |
| Business rule failure                 | Domain runner ([Layer 4](../04-domain-business-layer/README.md)) | Same scoping helper as source format  |
| Persisting errors to DB               | Layer 3 worker                                                   | `ProcessingJobErrorRepository`        |
| Downloading persisted errors          | Layer 3 controller                                               | `buildProcessingJobErrorsJsonl` below |

Plugins and domains append to one in-memory `errors: ErrorDetail[]`. The worker persists when `outcome` is `validation_failed`.

### Domain result

```typescript
return {
  outcome: "validation_failed",
  processedCount: validCount,
  errorCount: errors.length,
  errors,
};
```

Worker persistence: [Layer 3](../03-async-processing-core-layer/README.md).

## Domain Progress

Domain phases are separate from plugin phases (`parsing_workbook`, `parsing_lines`). Types live in Appendix B as `DomainProcessingProgress`.

| Phase             | When to emit              | Throttle                                            |
| ----------------- | ------------------------- | --------------------------------------------------- |
| `loading_source`  | Start of each source load | Immediate — `reportDomainProgress`                  |
| `validating_rows` | Row/line validation loop  | Throttled — `createThrottledDomainProgressReporter` |
| `saving_database` | Persistence loop          | Throttled                                           |

Use `DOMAIN_PROGRESS_THROTTLE_MS` from [Appendix C](../appendix-c-constants/README.md) as the default interval (1000 ms). Sandbox exports the same value as `DOMAIN_PROGRESS_EMIT_INTERVAL_MS` from `create-throttled-domain-progress.ts`.

Throttled reporters use a **trailing timer**: when `report` is called inside the interval, schedule one deferred emit with the latest counts instead of dropping the update. Call **`flush`** at phase end to cancel any pending timer and emit final counts with `percent`.

Clients discriminate SSE events by `progress.phase` alongside plugin progress payloads.

### Implementation pattern: immediate progress

```typescript
async function reportDomainProgress(
  onProgress: ((detail: unknown) => Promise<void>) | undefined,
  phase: DomainProcessingPhase,
  sourceId: string,
  options?: Partial<Omit<DomainProcessingProgress, "phase" | "sourceId">>,
) {
  if (!onProgress) return;

  const percent =
    options?.percent ??
    (options?.processedCount != null && options?.totalCount != null
      ? percentFromCounts(options.processedCount, options.totalCount)
      : undefined);

  await onProgress({
    phase,
    sourceId,
    ...options,
    percent,
  });
}
```

### Implementation pattern: throttled progress

Use for `validating_rows` and `saving_database`.

| Method   | Behavior |
| -------- | -------- |
| `report` | Store latest counts. If `intervalMs` has elapsed since the last emit, emit now. Otherwise schedule a **trailing** emit so clients still receive updates without spamming every row. |
| `flush`  | Cancel any pending trailing timer and emit immediately — call at phase end so final counts and `percent` reach clients. |

Every emit includes `percent` from `percentFromCounts(processedCount, totalCount)`.

```typescript
type PhaseProgressCounts = {
  totalCount: number;
  processedCount: number;
  validCount?: number;
  errorCount?: number;
};

function createThrottledDomainProgressReporter(
  onProgress,
  phase: "validating_rows" | "saving_database",
  sourceId: string,
  context: { originalName?: string; worksheetName?: string },
  intervalMs = DOMAIN_PROGRESS_THROTTLE_MS,
) {
  let lastEmitAt = 0;
  let latestCounts: PhaseProgressCounts | null = null;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTrailing = () => {
    if (trailingTimer) {
      clearTimeout(trailingTimer);
      trailingTimer = null;
    }
  };

  const emitNow = async (counts: PhaseProgressCounts) => {
    clearTrailing();
    latestCounts = counts;
    lastEmitAt = Date.now();
    await reportDomainProgress(onProgress, phase, sourceId, {
      ...context,
      ...counts,
      percent: percentFromCounts(counts.processedCount, counts.totalCount),
    });
  };

  const scheduleTrailing = () => {
    if (trailingTimer || !latestCounts) {
      return;
    }
    const delay = Math.max(0, intervalMs - (Date.now() - lastEmitAt));
    trailingTimer = setTimeout(() => {
      trailingTimer = null;
      if (latestCounts) {
        void emitNow(latestCounts);
      }
    }, delay);
  };

  return {
    async report(counts: PhaseProgressCounts) {
      latestCounts = counts;
      const now = Date.now();
      if (now - lastEmitAt >= intervalMs) {
        await emitNow(counts);
        return;
      }
      scheduleTrailing();
    },
    async flush(counts: PhaseProgressCounts) {
      await emitNow(counts);
    },
  };
}
```

### Implementation pattern: percent helper

```typescript
function percentFromCounts(processedCount: number, totalCount: number): number {
  if (totalCount <= 0) return processedCount > 0 ? 100 : 0;
  return Math.min(100, Math.round((processedCount / totalCount) * 100));
}
```

## Job Errors NDJSON

Used by `ProcessingController` for `GET jobs/:jobId/errors`. The worker persists structured rows; this helper formats the HTTP response.

```typescript
type ProcessingJobErrorsHeader = {
  kind: "header";
  jobId: string;
  domainKind: string;
  errorCount: number;
};

function buildProcessingJobErrorsJsonl(options: {
  jobId: string;
  domainKind: string;
  errorCount: number;
  errors: readonly ErrorDetail[];
}): string {
  const header: ProcessingJobErrorsHeader = {
    kind: "header",
    jobId: options.jobId,
    domainKind: options.domainKind,
    errorCount: options.errorCount,
  };
  return (
    [
      JSON.stringify(header),
      ...options.errors.map((e) => JSON.stringify(e)),
    ].join("\n") + "\n"
  );
}
```

Serve as `application/x-ndjson`. Line 1 is the header object; lines 2..N are one `ErrorDetail` per line.

## Optional Validation Error XLSX

Not stored by the worker. Build on demand from the same `ErrorDetail[]` for human review — separate API or export path.

Columns (omit empty columns): Source, Original Name, Worksheet, Row Number, Message, Raw Data.

```typescript
async function buildValidationErrorXlsxBuffer(
  errors: readonly ErrorDetail[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Validation Errors");
  // set columns from pickErrorColumns(errors)
  // add rows; wrap Raw Data column
  applyDefaultExportedSheetView(worksheet, columnCount);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
```

## Exported Sheet View

Apply on every tabular export sheet (including validation error XLSX):

```typescript
function applyDefaultExportedSheetView(
  worksheet: ExcelJS.Worksheet,
  columnCount?: number,
) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  const cols = columnCount ?? worksheet.columnCount;
  if (cols > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: cols },
    };
  }
}
```

## Module Layout

```text
import/shared/
  import-error.types.ts
  domain-processing.types.ts
  report-domain-progress.ts
  create-throttled-domain-progress.ts
  percent-from-counts.ts
  build-processing-job-errors-jsonl.ts
  build-validation-error-xlsx.ts
  apply-exported-sheet-view.ts
```

No `index.ts` barrel.

## Invariants

- One `ErrorDetail` type — plugins import it; they do not redefine it.
- Plugins never persist errors or build NDJSON download bodies.
- Worker receives `ErrorDetail[]` on `DomainRunResult`, not blobs.
- JSONL errors omit `worksheetName`.
- Domain progress helpers are format-agnostic — plugins emit their own `parsing_*` phases.

## Checklist

```text
- [ ] ErrorDetail imported by plugins and domains from import/shared
- [ ] reportDomainProgress for loading_source (immediate)
- [ ] createThrottledDomainProgressReporter for validating_rows / saving_database
- [ ] Throttled reporter: trailing timer within intervalMs; percent on every emit
- [ ] flush throttled reporter at phase end (cancel trailing timer, final counts)
- [ ] buildProcessingJobErrorsJsonl on GET jobs/:jobId/errors (Layer 3 controller)
- [ ] Optional error XLSX uses applyDefaultExportedSheetView
- [ ] No index.ts barrel in import/shared
```

## See Also

- [xlsx.md](./xlsx.md) — tabular plugin (`scopeTabularError`, `parsing_workbook`)
- [jsonl.md](./jsonl.md) — JSONL plugin (`scopeJsonlError`, `parsing_lines`)
- [Layer 4](../04-domain-business-layer/README.md) — domain runner and persistence
- [Layer 3](../03-async-processing-core-layer/README.md) — worker error persistence and SSE
