---
name: import-plugin-tabular-xlsx
description: >-
  Format plugins layer — tabular-xlsx: ExcelJS workbook load, headers, cell.text,
  row errors, TabularProcessingProgress, validation error XLSX. Use when implementing
  or extending import/plugins/tabular-xlsx for an async `.xlsx` sourceId.
---

# Format plugins layer — tabular-xlsx

Shared by all async `.xlsx` **`sourceId`** values. Domain **`DomainRunner`** calls this plugin; [async-processing](../async-processing/SKILL.md) owns **`DomainRunResult`**, SSE, and error blob storage. Upload: [import-upload-handoff](../import-upload-handoff/SKILL.md). JSONL errors merge into the same error XLSX — [import-plugin-jsonl](../import-plugin-jsonl/SKILL.md).

---

## Scope

| This plugin owns | Domain runner owns |
| --- | --- |
| ExcelJS load, headers, **`cell.text`**, row maps | **`TabularSheetSpec`** per sheet (domain module) |
| **`ErrorDetail`** at parse/validate site | Business rules, DB writes |
| **`buildTabularErrorXlsxBuffer`** | Map rows → **`DomainRunResult`** |
| Plugin progress phases | **`saving_database`** progress + **`onProgress`** |

| Must not (plugin) | |
| --- | --- |
| BullMQ, Redis, `domainKind` routing, Prisma | |

---

## When to use

- Any `.xlsx` **`sourceId`** in async processing (`import/plugins/tabular-xlsx/`).
- Building validation error XLSX from **`ErrorDetail[]`** (tabular-only or merged with JSONL).

---

## Types

```typescript
/** Plugin-emitted phases only */
type TabularPluginPhase = "parsing_workbook" | "validating_rows";

/** SSE progress — plugin phases + domain-only phase */
type TabularProcessingPhase = TabularPluginPhase | "saving_database";

/** Published via io.onProgress during domainRunner.run — Redis/SSE in async-processing */
type TabularProcessingProgress = {
  phase: TabularProcessingPhase;
  sourceId: string;
  /** Display filename — set from VerifiedProcessingSource.label (handoff originalName) */
  originalName?: string;
  worksheetName?: string;
  percent?: number;
};

/** Defined by domain module per domainKind / sheet (exact Excel header strings) */
type TabularSheetSpec = {
  sheetName: string;
  headers: readonly string[];
};

type ErrorDetail = {
  message: string;
  sourceId?: string;
  /** Set from VerifiedProcessingSource.label at scope site */
  originalName?: string;
  /** Tabular only — omit on JSONL errors (import-plugin-jsonl) */
  worksheetName?: string;
  /** 1-based Excel sheet row — set at parse site (not named sourceRowNumber elsewhere) */
  rowNumber?: number;
  rawData?: string;
};
```

---

## Plugin API (sketch)

```typescript
/** Read stream from io.openStream, then load workbook */
async function loadWorkbookFromBuffer(buffer: Buffer): Promise<ExcelJS.Workbook>;

type TabularRowHandler = (row: {
  rowNumber: number;
  cells: Record<string, string>;
}) => void | Promise<void>;

/** Streaming — preferred for large sheets */
async function parseSheetRows(
  workbook: ExcelJS.Workbook,
  spec: TabularSheetSpec,
  ctx: { sourceId: string; label?: string },
  handlers: {
    onRow: TabularRowHandler;
    onProgress?: (percent: number) => Promise<void>;
    pushError: (detail: ErrorDetail) => void;
  },
): Promise<void>;

/** Build downloadable error report — apply freeze + filter on header row */
async function buildTabularErrorXlsxBuffer(
  errors: readonly ErrorDetail[],
): Promise<Buffer>;
```

After **`loadWorkbookFromBuffer`**, domain validates business rules in **`onRow`**, collects **`ErrorDetail[]`**, and may emit **`saving_database`** progress itself.

---

## Domain integration

1. **`domainRunner.run`** receives **`VerifiedProcessingSource`** — get bytes from **`io.openStream(source)`** (buffer the stream, or use project stream helper).
2. **`loadWorkbookFromBuffer`** → **`parseSheetRows`** per **`TabularSheetSpec`** owned by the domain module.
3. Scope errors with **`sourceId`**, **`label` → `originalName`**, **`worksheetName`**, **`rowNumber`** (1-based Excel row).
4. Merge tabular errors with JSONL **`ErrorDetail[]`** when the domain has multiple plugins.
5. On validation failures:

```typescript
const errors: ErrorDetail[] = [...tabularErrors, ...jsonlErrors];

if (errors.length > 0) {
  const errorBlob = await buildTabularErrorXlsxBuffer(errors);
  return {
    outcome: "validation_failed",
    processedCount,
    errorCount: errors.length,
    errorBlob,
  };
}

return { outcome: "success", processedCount, errorCount: 0 };
```

Worker stores **`errorBlob`** via **`ProcessingErrorBlobStore`** — [async-processing](../async-processing/SKILL.md#processingerrorblobstore). When **`errorCount > 0`**, always return **`errorBlob`**.

**`saving_database`** progress — domain calls **`reportTabularProgress`** during persistence; plugin does not emit this phase.

---

## Responsibilities

| Concern | tabular-xlsx plugin |
| ------- | ------------------- |
| Load buffer into ExcelJS workbook | yes |
| Assert required sheet names exist | yes |
| Validate headers against **`TabularSheetSpec`** | yes |
| Read cells with **`cell.text`** (trim at ingest) | yes |
| Row loop, skip blank rows, set **`ErrorDetail.rowNumber`** | yes |
| Scoped error helper (`sourceId`, worksheet, `label`) | yes |
| **`buildTabularErrorXlsxBuffer`** from **`ErrorDetail[]`** | yes |
| JSONL-only error download | **no** — jsonl plugin; merge here |

---

## Error XLSX

| Column | Include when |
| ------ | ------------ |
| Source | any error has `sourceId` |
| Original name | any error has `originalName` |
| Worksheet | any error has `worksheetName` |
| Row Number, Message, Raw Data | always |

On every error sheet after headers and body rows: **freeze row 1** and **enable auto-filter** (project helper **`applyDefaultExportedSheetView`** when available — see `.cursor/rules/exceljs-xlsx-conventions.mdc`).

Processing layer stores bytes; this plugin builds the buffer only.

---

## Progress helper

```typescript
await reportTabularProgress(onProgress, "parsing_workbook", "mainWorkbook", {
  worksheetName: "Orders",
  originalName: source.label,
  percent: 42,
});
```

**`saving_database`:**

```typescript
await reportTabularProgress(onProgress, "saving_database", "mainWorkbook", {
  originalName: source.label,
  percent: 80,
});
```

---

## Suggested files

```text
import/plugins/tabular-xlsx/
  tabular-processing.types.ts
  load-workbook-from-buffer.ts
  parse-sheet-rows.ts
  scope-tabular-errors.ts
  build-tabular-error-xlsx.ts
  report-tabular-progress.ts
```

---

## Checklist

```text
- [ ] Stream → buffer → loadWorkbookFromBuffer inside domainRunner
- [ ] TabularSheetSpec owned by domain; plugin validates headers only
- [ ] cell.text + trim at ingest; rowNumber = 1-based Excel row on ErrorDetail
- [ ] originalName on errors/progress from VerifiedProcessingSource.label
- [ ] buildTabularErrorXlsxBuffer on validation_failed → DomainRunResult.errorBlob
- [ ] Merge JSONL ErrorDetail[] when domain has jsonl sources
- [ ] Error XLSX: freeze header row + auto-filter
```

---

## Agent invocation

| Task | Skills |
| ---- | ------ |
| Tabular parse, error XLSX builder | `import-plugin-tabular-xlsx` |
| JSONL lines + merged errors | `import-plugin-jsonl` + this skill |
| DomainRunner, DomainRunResult, SSE | `async-processing` |
