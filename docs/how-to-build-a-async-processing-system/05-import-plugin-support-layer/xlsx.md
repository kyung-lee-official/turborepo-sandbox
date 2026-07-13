# Tabular XLSX Plugin

Business-agnostic `.xlsx` import for any async `sourceId`. The domain `DomainRunner` supplies sheet layout (`TabularSheetSpec`) and business rules in `onRow`.

Does not depend on the [JSONL plugin](./jsonl.md). Shared utilities: [import-shared.md](./import-shared.md).

Types: [Appendix B — tabular-xlsx-plugin.types.ts](../appendix-b-shared-types/05-import-plugin-support-layer/tabular-xlsx-plugin.types.ts).

## Boundary

```text
Readable or Buffer from domain
  -> load workbook (ExcelJS)
  -> parseSheetRows per TabularSheetSpec
  -> onRow callbacks + parse-time ErrorDetail
  -> parsing_workbook progress
```

## Scope

| This plugin owns                                 | Domain runner owns                                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| ExcelJS load, headers, `cell.text`, row maps     | `TabularSheetSpec` per sheet (exact header strings)                                                       |
| Parse-time `ErrorDetail` via `scopeTabularError` | Business rules in `onRow`, persistence                                                                    |
| `parsing_workbook` progress                      | `loading_source`, `validating_rows`, `saving_database` ([Layer 4](../04-domain-business-layer/README.md)) |
|                                                  | `DomainRunResult` with `errors: ErrorDetail[]`                                                            |

### Must not

- BullMQ, Redis, `domainKind`, Prisma, or job APIs.
- `buildValidationErrorXlsxBuffer` or error download formatting.
- Hardcoded domain sheet names, columns, or business schemas.
- Define `ErrorDetail` — import from [import-shared.md](./import-shared.md).
- Import the JSONL plugin.

## When to Use

- Any async job that ingests a `.xlsx` `sourceId`.
- Alone or alongside JSONL — the domain merges `errors[]` if both are used.

## Types

```typescript
type TabularPluginPhase = "parsing_workbook";

type TabularProcessingProgress = {
  phase: TabularPluginPhase;
  sourceId: string;
  originalName?: string;
  worksheetName?: string;
  percent?: number;
};

type TabularSheetSpec = {
  sheetName: string;
  headers: readonly string[];
};

type TabularParseContext = { sourceId: string; label?: string };
```

## Plugin API

```typescript
async function loadWorkbookFromBuffer(
  buffer: Buffer,
): Promise<ExcelJS.Workbook>;
async function loadWorkbookFromStream(
  stream: Readable,
): Promise<ExcelJS.Workbook>;
async function readStreamToBuffer(stream: Readable): Promise<Buffer>;

async function parseSheetRows(
  workbook: ExcelJS.Workbook,
  spec: TabularSheetSpec,
  ctx: TabularParseContext,
  handlers: {
    onRow: (row: {
      rowNumber: number;
      cells: Record<string, string>;
    }) => void | Promise<void>;
    onProgress?: (percent: number) => Promise<void>;
    pushError: (detail: ErrorDetail) => void;
  },
): Promise<void>;

function scopeTabularError(
  detail: ErrorDetail,
  scope: { sourceId: string; originalName?: string; worksheetName?: string },
): ErrorDetail;

async function reportTabularProgress(
  onProgress: ((detail: unknown) => Promise<void>) | undefined,
  phase: TabularPluginPhase,
  sourceId: string,
  options?: { worksheetName?: string; originalName?: string; percent?: number },
): Promise<void>;
```

`parseSheetRows` scopes parse-time errors with `scopeTabularError` before `pushError`. The domain validates in `onRow` and appends business `ErrorDetail` the same way.

## Parse Rules

- Read cell values with **`cell.text`** (trim at ingest), not raw `cell.value` — formulas and hyperlinks surface correctly on `text`.
- Header row is row 1; validate against `spec.headers` with exact string match.
- Data rows start at row 2; skip blank data rows (all header columns empty after trim).
- `rowNumber` in `onRow` is the 1-based Excel row index.
- Missing worksheet or header mismatch: push scoped errors and stop parsing that sheet.

## Implementation pattern: load workbook

```typescript
async function loadWorkbookFromBuffer(
  buffer: Buffer,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

async function loadWorkbookFromStream(
  stream: Readable,
): Promise<ExcelJS.Workbook> {
  const buffer = await readStreamToBuffer(stream);
  return loadWorkbookFromBuffer(buffer);
}
```

## Implementation pattern: scope errors

```typescript
function scopeTabularError(
  detail: ErrorDetail,
  scope: { sourceId: string; originalName?: string; worksheetName?: string },
): ErrorDetail {
  return {
    ...detail,
    sourceId: detail.sourceId ?? scope.sourceId,
    originalName: detail.originalName ?? scope.originalName,
    worksheetName: detail.worksheetName ?? scope.worksheetName,
  };
}
```

## Implementation pattern: `parseSheetRows` (outline)

```typescript
async function parseSheetRows(workbook, spec, ctx, handlers) {
  const scope = {
    sourceId: ctx.sourceId,
    originalName: ctx.label,
    worksheetName: spec.sheetName,
  };

  const worksheet = workbook.getWorksheet(spec.sheetName);
  if (!worksheet) {
    handlers.pushError(
      scopeTabularError(
        { message: `Worksheet not found: ${spec.sheetName}` },
        scope,
      ),
    );
    return;
  }

  const actualHeaders = readHeaderTextsFromRow(worksheet, spec.headers.length);
  const headerErrors = validateWorksheetHeaders(spec.headers, actualHeaders);
  for (const message of headerErrors) {
    handlers.pushError(scopeTabularError({ message }, scope));
  }
  if (headerErrors.length > 0) return;

  const totalDataRows = countNonBlankDataRows(worksheet, spec.headers);
  let processed = 0;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!rowHasContent(row, spec.headers)) continue;

    const cells = readCellsFromRowByHeaders(row, spec.headers);
    await handlers.onRow({ rowNumber, cells });
    processed++;

    if (handlers.onProgress && totalDataRows > 0) {
      const percent = Math.round((processed / totalDataRows) * 100);
      await handlers.onProgress(percent);
    }
  }
}
```

## Implementation pattern: tabular progress

```typescript
async function reportTabularProgress(onProgress, phase, sourceId, options) {
  if (!onProgress) return;
  await onProgress({
    phase,
    sourceId,
    worksheetName: options?.worksheetName,
    originalName: options?.originalName,
    percent: options?.percent,
  });
}
```

## Domain Integration

The domain opens the stream and owns `TabularSheetSpec` values.

```typescript
const stream = await io.openStream(source);
const workbook = await loadWorkbookFromStream(stream);
const errors: ErrorDetail[] = [];

await parseSheetRows(
  workbook,
  sheetSpec,
  { sourceId: source.sourceId, label: source.label },
  {
    pushError: (detail) => errors.push(detail),
    onProgress: async (percent) => {
      await reportTabularProgress(
        io.onProgress,
        "parsing_workbook",
        source.sourceId,
        {
          originalName: source.label,
          worksheetName: sheetSpec.sheetName,
          percent,
        },
      );
    },
    onRow: async ({ rowNumber, cells }) => {
      const message = validateBusinessRules(cells);
      if (message) {
        errors.push(
          scopeTabularError(
            { message, rowNumber, rawData: JSON.stringify(cells) },
            {
              sourceId: source.sourceId,
              originalName: source.label,
              worksheetName: sheetSpec.sheetName,
            },
          ),
        );
      }
      // persist valid rows
    },
  },
);
```

Post-parse phases (`validating_rows`, `saving_database`): [import-shared.md](./import-shared.md) and [Layer 4](../04-domain-business-layer/README.md).

## Progress Phases

| Phase                                                  | Who emits                               | Helper                                 |
| ------------------------------------------------------ | --------------------------------------- | -------------------------------------- |
| `parsing_workbook`                                     | This plugin (domain wraps `onProgress`) | `reportTabularProgress`                |
| `loading_source`, `validating_rows`, `saving_database` | Domain runner                           | [import-shared.md](./import-shared.md) |

Clients discriminate live SSE events by `progress.phase`.

## Module Layout

```text
import/plugins/tabular-xlsx/
  tabular-processing.types.ts
  load-workbook-from-buffer.ts
  parse-sheet-rows.ts
  scope-tabular-errors.ts
  report-tabular-progress.ts
```

No `index.ts` barrel re-exports.

## Invariants

- `TabularSheetSpec` is domain-owned; the plugin validates headers only.
- `ErrorDetail` comes from import/shared — see [import-shared.md](./import-shared.md).
- Plugin emits `parsing_workbook` only.
- Optional error XLSX via [import-shared.md](./import-shared.md) — not this plugin.

## Checklist

```text
- [ ] TabularSheetSpec owned by domain; plugin validates headers only
- [ ] cell.text + trim at ingest; rowNumber = 1-based Excel row
- [ ] ErrorDetail from import/shared — see import-shared.md
- [ ] Plugin emits parsing_workbook only; domain emits validating_rows / saving_database
- [ ] No index.ts barrel re-exports
- [ ] No import from jsonl plugin
```

## See Also

- [import-shared.md](./import-shared.md) — shared errors and domain progress
- [jsonl.md](./jsonl.md) — peer format plugin (optional in same domain)
- [Layer 4](../04-domain-business-layer/README.md) — domain runner and persistence
