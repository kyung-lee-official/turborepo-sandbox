---
name: import-plugin-tabular-xlsx
description: >-
  Format plugins layer — tabular-xlsx: ExcelJS workbook load, headers, cell.text,
  row maps, parsing_workbook progress. Business-agnostic .xlsx import for async processing.
---

# Format plugins layer — tabular-xlsx

**Business-agnostic** `.xlsx` import for any async **`sourceId`**. Domain **`DomainRunner`** supplies sheet layout (**`TabularSheetSpec`**) and business rules in **`onRow`**. Shared validation errors and error XLSX — [import-shared](../import-shared/SKILL.md). Job orchestration — [async-processing](../async-processing/SKILL.md). Upload — [start-processing-adapters](../start-processing-adapters/SKILL.md).

Implement under **`apps/nest-app/src/import/plugins/tabular-xlsx/`** (no barrel **`index.ts`** — import concrete files).

---

## Scope

| This plugin owns | Domain runner owns |
| --- | --- |
| ExcelJS load, headers, **`cell.text`**, row maps | **`TabularSheetSpec`** per sheet (exact header strings) |
| Parse-site **`ErrorDetail`** via **`scopeTabularError`** | Business rules in **`onRow`**, persistence |
| **`parsing_workbook`** via optional percent callback | **`validating_rows`**, **`saving_database`** — [import-shared](../import-shared/SKILL.md) |
| | **`buildValidationErrorXlsxBuffer`**, **`DomainRunResult`** |

| Must not (plugin) | |
| --- | --- |
| BullMQ, Redis, `domainKind` routing, Prisma | |
| **`buildValidationErrorXlsxBuffer`** | |
| Domain-specific columns, schemas, or sheet names hardcoded | |

---

## When to use

- Any async job that ingests a **`.xlsx`** **`sourceId`**.
- Domains may use this plugin **alone** or alongside **jsonl** — the domain merges errors if needed.

---

## Types

Import **`ErrorDetail`** from [import-shared](../import-shared/SKILL.md) (`import/shared/import-error.types.ts`).

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

---

## Plugin API (sketch)

```typescript
async function loadWorkbookFromBuffer(buffer: Buffer): Promise<ExcelJS.Workbook>;
async function loadWorkbookFromStream(stream: Readable): Promise<ExcelJS.Workbook>;
async function readStreamToBuffer(stream: Readable): Promise<Buffer>;

async function parseSheetRows(
  workbook: ExcelJS.Workbook,
  spec: TabularSheetSpec,
  ctx: TabularParseContext,
  handlers: {
    onRow: (row: { rowNumber: number; cells: Record<string, string> }) => void | Promise<void>;
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

**`parseSheetRows`** scopes parse-time errors with **`scopeTabularError`** before **`pushError`**. Domain validates in **`onRow`** and appends business **`ErrorDetail`** the same way.

---

## Domain integration (example)

1. **`stream = await io.openStream(source)`**, then **`loadWorkbookFromStream`** / **`loadWorkbookFromBuffer`**.
2. **`parseSheetRows`** per domain-owned **`TabularSheetSpec`**:

```typescript
await parseSheetRows(workbook, sheetSpec, { sourceId: source.sourceId, label: source.label }, {
  pushError: (detail) => errors.push(detail),
  onProgress: async (percent) => {
    await reportTabularProgress(io.onProgress, "parsing_workbook", source.sourceId, {
      originalName: source.label,
      worksheetName: sheetSpec.sheetName,
      percent,
    });
  },
  onRow: async ({ rowNumber, cells }) => {
    // domain business rules; scopeTabularError(...) into errors
  },
});
```

3. Post-parse phases and error XLSX — domain uses [import-shared](../import-shared/SKILL.md) (**`reportDomainProgress`**, **`buildValidationErrorXlsxBuffer`**).

---

## Progress

| Phase | Who emits | Helper |
| ----- | --------- | ------ |
| **`parsing_workbook`** | **`parseSheetRows`** (domain wraps **`onProgress`**) | **`reportTabularProgress`** |
| **`validating_rows`**, **`saving_database`** | Domain runner | **`reportDomainProgress`** (import-shared) |

---

## Suggested files

```text
import/plugins/tabular-xlsx/
  tabular-processing.types.ts
  load-workbook-from-buffer.ts
  parse-sheet-rows.ts
  scope-tabular-errors.ts
  report-tabular-progress.ts
```

---

## Checklist

```text
- [ ] TabularSheetSpec owned by domain; plugin validates headers only
- [ ] cell.text + trim at ingest; rowNumber = 1-based Excel row
- [ ] ErrorDetail from import/shared — not defined in this plugin
- [ ] Plugin emits parsing_workbook only; domain emits validating_rows / saving_database
- [ ] Domain builds error XLSX via import/shared — not this plugin
- [ ] No index.ts barrel re-exports
```

---

## Agent invocation

| Task | Skills |
| ---- | ------ |
| Tabular parse, parsing_workbook progress | `import-plugin-tabular-xlsx` |
| Error type, error XLSX, domain progress | `import-shared` |
| JSONL parse (separate peer plugin) | `import-plugin-jsonl` |
| DomainRunner, DomainRunResult, SSE | `async-processing` |
