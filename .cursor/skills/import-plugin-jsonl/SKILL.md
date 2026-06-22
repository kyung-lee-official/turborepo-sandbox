---
name: import-plugin-jsonl
description: >-
  Format plugins layer — jsonl: line-delimited JSON parse, JsonlProcessingProgress,
  line-level errors. Use when implementing import/plugins/jsonl for an async
  JSONL sourceId (.jsonl / application/x-ndjson).
---

# Format plugins layer — jsonl

Shared by all async JSONL **`sourceId`** values. Domain **`DomainRunner`** calls this plugin; [async-processing](../async-processing/SKILL.md) owns **`DomainRunResult`**, SSE, and error blob storage. Upload: [import-upload-handoff](../import-upload-handoff/SKILL.md). Validation error download merges into tabular-xlsx — [import-plugin-tabular-xlsx](../import-plugin-tabular-xlsx/SKILL.md).

---

## Scope

| This plugin owns | Domain runner owns |
| --- | --- |
| Read/parse a **`Readable`** line by line | **`io.openStream(source)`** per **`VerifiedProcessingSource`** |
| **`JSON.parse`**, trim string fields at ingest | Business rules in **`onLine`** |
| Parse-site **`ErrorDetail`** (bad JSON, non-object line) | **`validating_rows`** and **`saving_database`** progress |
| **`parsing_lines`** progress via **`reportJsonlProgress`** | Merge errors, **`buildTabularErrorXlsxBuffer`**, **`DomainRunResult`** |

| Must not (plugin) | |
| --- | --- |
| BullMQ, Redis, `domainKind` routing, Prisma | |
| **`io.openStream`** or locator verification | |
| Separate JSONL error download file | |

---

## When to use

- Line-delimited JSON **`sourceId`** values (`.jsonl`, `application/x-ndjson`).
- Implementing `import/plugins/jsonl/` (e.g. `productDescriptions` on `sales-report`).

---

## Types

```typescript
/** Plugin-emitted phase only — read + JSON.parse per line */
type JsonlPluginPhase = "parsing_lines";

/** SSE progress — plugin + domain phases */
type JsonlProcessingPhase =
  | JsonlPluginPhase
  | "validating_rows"
  | "saving_database";

/** Published via io.onProgress during domainRunner.run — Redis/SSE in async-processing */
type JsonlProcessingProgress = {
  phase: JsonlProcessingPhase;
  sourceId: string;
  /** Display filename — set from VerifiedProcessingSource.label (handoff originalName) */
  originalName?: string;
  percent?: number;
};

/**
 * Same contract as tabular-xlsx ErrorDetail — omit worksheetName on JSONL errors.
 * See import-plugin-tabular-xlsx § Types.
 */
type ErrorDetail = {
  message: string;
  sourceId?: string;
  /** Set from VerifiedProcessingSource.label at scope site */
  originalName?: string;
  /**
   * 1-based source line (physical line in the file).
   * Maps to the "Row Number" column in merged buildTabularErrorXlsxBuffer output.
   */
  rowNumber?: number;
  rawData?: string;
};
```

---

## Parse behavior

| Input | Behavior |
| ----- | -------- |
| Empty or whitespace-only line | **Skip** — do not call **`onLine`**, do not **`pushError`** |
| Invalid JSON on a line | **`pushError`** with message, **`rowNumber`**, **`rawData`** = original line text (trim outer whitespace only for storage) |
| JSON parses to non-object (array, string, number, null) | **`pushError`** — one object per line required |
| Valid object line | Trim **string** field values once inside parser; pass trimmed **`record`** to **`onLine`** |
| UTF-8 | Expected; strip optional BOM on first line only |
| **`percent`** during parse | Optional — use lines processed when total unknown; omit or estimate if no line count |

Domain **`onLine`** receives strings **as trimmed at ingest** — do not re-trim for business logic.

---

## Plugin API (sketch)

```typescript
type JsonlLineHandler = (line: {
  rowNumber: number;
  /** Parsed object; string fields already trimmed at ingest */
  record: Record<string, unknown>;
}) => void | Promise<void>;

/**
 * Domain opens stream; plugin reads until EOF.
 * Internally calls reportJsonlProgress(..., "parsing_lines", ...) at start and
 * every N lines (and on completion). Does not emit validating_rows or saving_database.
 */
async function parseJsonlLines(
  stream: Readable,
  ctx: { sourceId: string; label?: string },
  handlers: {
    onLine: JsonlLineHandler;
    onProgress: (detail: unknown) => Promise<void>;
    pushError: (detail: ErrorDetail) => void;
  },
): Promise<void>;

async function reportJsonlProgress(
  onProgress: (detail: unknown) => Promise<void>,
  phase: JsonlProcessingPhase,
  sourceId: string,
  opts?: { originalName?: string; percent?: number },
): Promise<void>;

/** Attach sourceId / originalName from ctx at parse site */
function scopeJsonlError(
  detail: Omit<ErrorDetail, "sourceId" | "originalName">,
  ctx: { sourceId: string; label?: string },
): ErrorDetail;
```

---

## Domain integration

1. **`domainRunner.run`** — for each JSONL source: **`stream = await io.openStream(source)`**.
2. **`parseJsonlLines(stream, { sourceId, label: source.label }, { onLine, onProgress: io.onProgress, pushError })`**.
3. In **`onLine`**: run business rules; append domain **`ErrorDetail[]`** (use **`scopeJsonlError`** or equivalent); call **`reportJsonlProgress(io.onProgress, "validating_rows", ...)`** during heavy validation if useful.
4. During DB writes: **`reportJsonlProgress(io.onProgress, "saving_database", ...)`**.
5. Merge tabular + JSONL errors; on failures:

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

## Responsibilities

| Concern | jsonl plugin |
| ------- | ------------ |
| Read **`Readable`**, split on newlines, **`JSON.parse`** per line | yes |
| Skip blank lines; error on invalid JSON / non-object | yes |
| Trim string fields at ingest before **`onLine`** | yes |
| Set **`ErrorDetail.rowNumber`** (1-based source line) | yes |
| **`scopeJsonlError`** at parse site | yes |
| **`reportJsonlProgress`** for **`parsing_lines`** only | yes |
| Open stream (**`io.openStream`**) | **no** — domain |
| Business validation progress (**`validating_rows`**) | **no** — domain |
| **`buildTabularErrorXlsxBuffer`** | **no** — tabular-xlsx plugin |

Large files: line callback streaming only (no full-file buffer in plugin).

---

## Progress

**Plugin** — **`parseJsonlLines`** calls **`reportJsonlProgress`** with phase **`parsing_lines`**:

```typescript
await reportJsonlProgress(onProgress, "parsing_lines", "productDescriptions", {
  originalName: source.label,
  percent: 42, // optional when line total unknown
});
```

**Domain** — **`validating_rows`** during **`onLine`** / batch validation:

```typescript
await reportJsonlProgress(onProgress, "validating_rows", "productDescriptions", {
  originalName: source.label,
  percent: 60,
});
```

**Domain** — **`saving_database`** during persistence:

```typescript
await reportJsonlProgress(onProgress, "saving_database", "productDescriptions", {
  originalName: source.label,
  percent: 80,
});
```

Clients may receive **`JsonlProcessingProgress`** or **`TabularProcessingProgress`** on the same job when the domain uses both plugins — discriminate on **`phase`** / shape.

---

## Suggested files

```text
import/plugins/jsonl/
  jsonl-processing.types.ts
  parse-jsonl-lines.ts
  scope-jsonl-errors.ts
  report-jsonl-progress.ts
```

Extract shared **`ErrorDetail`** typing to a small shared module later if tabular and jsonl drift.

---

## Checklist

```text
- [ ] Domain opens io.openStream; plugin receives Readable only
- [ ] Blank lines skipped; invalid JSON / non-object → ErrorDetail with rawData
- [ ] Trim string fields in parser before onLine; domain does not re-trim
- [ ] rowNumber = 1-based source line; no worksheetName on JSONL errors
- [ ] originalName from VerifiedProcessingSource.label on errors/progress
- [ ] Plugin emits parsing_lines only; domain emits validating_rows + saving_database
- [ ] parseJsonlLines calls reportJsonlProgress internally during line loop
- [ ] Domain merges errors → buildTabularErrorXlsxBuffer → DomainRunResult.errorBlob
```

---

## Agent invocation

| Task | Skills |
| ---- | ------ |
| JSONL parse, line progress | `import-plugin-jsonl` |
| Merged error XLSX | `import-plugin-tabular-xlsx` + this skill |
| DomainRunner, SSE, job records | `async-processing` |
| Upload, deferred start | `import-upload-handoff` + upload-* |
