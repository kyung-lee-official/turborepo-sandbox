---
name: import-plugin-jsonl
description: >-
  Format plugins layer — jsonl: line-delimited JSON parse, JsonlProcessingProgress,
  line-level errors. Use when implementing import/plugins/jsonl for an async
  JSONL sourceId (.jsonl / application/x-ndjson).
---

# Format plugins layer — jsonl

Shared by all async JSONL **`sourceId`** values. Domain **`DomainRunner`** calls this plugin; [async-processing](../async-processing/SKILL.md) owns **`DomainRunResult`**, SSE, and error blob storage. Upload: [start-processing-adapters](../start-processing-adapters/SKILL.md). Validation error download merges into tabular-xlsx — [import-plugin-tabular-xlsx](../import-plugin-tabular-xlsx/SKILL.md).

Implement under **`apps/nest-app/src/import/plugins/jsonl/`** (no barrel **`index.ts`** — import concrete files).

---

## Scope

| This plugin owns | Domain runner owns |
| --- | --- |
| Read **`Readable`**, split lines, **`JSON.parse`** per line | **`io.openStream(source)`** per **`VerifiedProcessingSource`** |
| Parse-site **`ErrorDetail`** (bad JSON, non-object line) | Business rules in **`onLine`** |
| Trim **string** fields at ingest before **`onLine`** | **`validating_rows`** and **`saving_database`** progress |
| **`parsing_lines`** via optional percent callback | Merge errors, **`buildTabularErrorXlsxBuffer`**, **`DomainRunResult`** |

| Must not (plugin) | |
| --- | --- |
| BullMQ, Redis, `domainKind` routing, Prisma | |
| **`io.openStream`** or locator verification | |
| **`buildTabularErrorXlsxBuffer`** or separate JSONL error download | |

---

## When to use

- Line-delimited JSON **`sourceId`** values (`.jsonl`, `application/x-ndjson`).
- Example: `productDescriptions` on a `sales-report` **`domainKind`**.

---

## Types

**`ErrorDetail`** — canonical definition in [import-plugin-tabular-xlsx § Types](../import-plugin-tabular-xlsx/SKILL.md#types) (`tabular-processing.types.ts`). JSONL errors use the same shape; **omit `worksheetName`**. **`rowNumber`** is the **1-based physical line** in the file (error XLSX column header stays **Row Number** when merged with tabular errors).

```typescript
/** Plugin-emitted phase only */
type JsonlPluginPhase = "parsing_lines";

/** Plugin phase + domain-only phases (same union pattern as tabular-xlsx) */
type JsonlProcessingPhase =
  | JsonlPluginPhase
  | "validating_rows"
  | "saving_database";

type JsonlProcessingProgress = {
  phase: JsonlProcessingPhase;
  sourceId: string;
  /** From VerifiedProcessingSource.label (upload originalName) */
  originalName?: string;
  percent?: number;
};

type JsonlParseContext = {
  sourceId: string;
  label?: string;
};

type JsonlErrorScope = {
  sourceId: string;
  originalName?: string;
};
```

---

## Parse behavior

| Input | Behavior |
| ----- | -------- |
| Empty or whitespace-only line | **Skip** — no **`onLine`**, no **`pushError`** |
| Invalid JSON | **`pushError`** — scoped parse error with **`rowNumber`**, **`rawData`** = line text (trim outer whitespace only for storage) |
| JSON parses to non-object (`null`, array, primitive) | **`pushError`** — one object per line required; `{}` is valid |
| Valid object line | Trim **top-level string** values once; pass **`record`** to **`onLine`** |
| Line endings | Split on `\n`; strip trailing `\r` (CRLF) |
| UTF-8 | Expected; strip BOM on first line only when present |
| Final line | Line without trailing `\n` is still parsed |
| **`rowNumber`** | Always **1-based physical line in the file** (blank lines still increment the counter) |
| Progress | Optional **`onProgress(percent)`** — **`percent`** from **non-blank lines processed** vs total non-blank lines when known; omit **`percent`** when total unknown |

Domain **`onLine`** receives strings **as trimmed at ingest** — do not re-trim for business logic ([coding convention](../../../.cursor/rules/coding-convention.mdc)).

**`parseJsonlLines`** applies **`scopeJsonlError`** for parse-time errors before **`pushError`**. Domain appends business **`ErrorDetail`** via **`scopeJsonlError`** (or equivalent) in **`onLine`**.

---

## Plugin API (sketch)

Mirror [import-plugin-tabular-xlsx § Plugin API](../import-plugin-tabular-xlsx/SKILL.md#plugin-api-sketch): optional percent callback on parse; domain wraps with **`reportJsonlProgress`**.

```typescript
type JsonlLineHandler = (line: {
  rowNumber: number;
  record: Record<string, unknown>;
}) => void | Promise<void>;

/** Domain opens stream; plugin reads until EOF. Does not call io.openStream. */
async function parseJsonlLines(
  stream: Readable,
  ctx: JsonlParseContext,
  handlers: {
    onLine: JsonlLineHandler;
    /** Optional — plugin calls with 0–100 while iterating lines */
    onProgress?: (percent: number) => Promise<void>;
    pushError: (detail: ErrorDetail) => void;
  },
): Promise<void>;

async function reportJsonlProgress(
  onProgress: ((detail: unknown) => Promise<void>) | undefined,
  phase: JsonlProcessingPhase,
  sourceId: string,
  options?: { originalName?: string; percent?: number },
): Promise<void>;

function scopeJsonlError(
  detail: ErrorDetail,
  scope: JsonlErrorScope,
): ErrorDetail;
```

---

## Domain integration

1. **`domainRunner.run`** — for each JSONL source: **`stream = await io.openStream(source)`**.
2. **`parseJsonlLines`** with **`ctx: { sourceId: source.sourceId, label: source.label }`**:

```typescript
await parseJsonlLines(stream, { sourceId: source.sourceId, label: source.label }, {
  pushError: (detail) => jsonlErrors.push(detail),
  onProgress: async (percent) => {
    await reportJsonlProgress(io.onProgress, "parsing_lines", source.sourceId, {
      originalName: source.label,
      percent,
    });
  },
  onLine: async ({ rowNumber, record }) => {
    const message = validateRecord(record);
    if (message) {
      jsonlErrors.push(
        scopeJsonlError(
          { message, rowNumber, rawData: JSON.stringify(record) },
          { sourceId: source.sourceId, originalName: source.label },
        ),
      );
    }
  },
});
```

3. During heavy validation: **`reportJsonlProgress(io.onProgress, "validating_rows", ...)`**.
4. During DB writes: **`reportJsonlProgress(io.onProgress, "saving_database", ...)`**.
5. Merge tabular + JSONL **`ErrorDetail[]`**; on failures:

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

---

## Progress

| Phase | Who emits | Helper |
| ----- | --------- | ------ |
| **`parsing_lines`** | **`parseJsonlLines`** (via domain **`onProgress`** wrapper) | **`reportJsonlProgress`** |
| **`validating_rows`** | Domain in **`onLine`** / batch validation | **`reportJsonlProgress`** |
| **`saving_database`** | Domain during persistence | **`reportJsonlProgress`** |

Same job may interleave **`TabularProcessingProgress`** and **`JsonlProcessingProgress`** events — clients discriminate on **`phase`** (and optional **`worksheetName`** on tabular events only).

---

## Suggested files

```text
import/plugins/jsonl/
  jsonl-processing.types.ts     # JsonlProcessingProgress, JsonlParseContext; import ErrorDetail from tabular-xlsx
  parse-jsonl-lines.ts
  scope-jsonl-errors.ts
  report-jsonl-progress.ts
```

---

## Checklist

```text
- [ ] Domain opens io.openStream; plugin receives Readable only
- [ ] ErrorDetail from tabular-xlsx types — no duplicate definition
- [ ] Blank lines skipped; invalid JSON / non-object → scoped ErrorDetail with rawData
- [ ] Trim top-level string fields before onLine; domain does not re-trim
- [ ] rowNumber = 1-based source line; no worksheetName on JSONL errors
- [ ] originalName from VerifiedProcessingSource.label on errors/progress
- [ ] Plugin: parsing_lines only (percent callback); domain: validating_rows + saving_database
- [ ] Domain merges errors → buildTabularErrorXlsxBuffer → DomainRunResult.errorBlob
- [ ] No index.ts barrel re-exports
```

---

## Agent invocation

| Task | Skills |
| ---- | ------ |
| JSONL parse, line progress | `import-plugin-jsonl` |
| Merged error XLSX | `import-plugin-tabular-xlsx` + this skill |
| DomainRunner, SSE, job records | `async-processing` |
| Upload, deferred start | `start-processing-adapters` + upload-* |
