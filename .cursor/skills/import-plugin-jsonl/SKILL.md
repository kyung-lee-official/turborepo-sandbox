---
name: import-plugin-jsonl
description: >-
  Format plugins layer — jsonl: line-delimited JSON parse, parsing_lines progress,
  line-level errors. Business-agnostic .jsonl import for async processing.
---

# Format plugins layer — jsonl

**Business-agnostic** JSONL / NDJSON import for any async **`sourceId`**. Domain **`DomainRunner`** implements business rules in **`onLine`**. Shared validation errors and error XLSX — [import-shared](../import-shared/SKILL.md). Job orchestration — [async-processing](../async-processing/SKILL.md). Upload — [start-processing-adapters](../start-processing-adapters/SKILL.md).

Implement under **`apps/nest-app/src/import/plugins/jsonl/`** (no barrel **`index.ts`** — import concrete files).

---

## Scope

| This plugin owns | Domain runner owns |
| --- | --- |
| Read **`Readable`**, split lines, **`JSON.parse`** per line | **`io.openStream(source)`** per **`VerifiedProcessingSource`** |
| Parse-site **`ErrorDetail`** (bad JSON, non-object line) | Business rules in **`onLine`** |
| Trim **string** fields at ingest before **`onLine`** | **`validating_rows`**, **`saving_database`** — [import-shared](../import-shared/SKILL.md) |
| **`parsing_lines`** via optional percent callback | **`buildValidationErrorXlsxBuffer`**, **`DomainRunResult`** |

| Must not (plugin) | |
| --- | --- |
| BullMQ, Redis, `domainKind` routing, Prisma | |
| **`io.openStream`** or locator verification | |
| **`buildValidationErrorXlsxBuffer`** or error download format | |
| Domain-specific field names or schemas hardcoded | |

---

## When to use

- Any async job that ingests **`.jsonl`** / **`application/x-ndjson`** **`sourceId`** values.
- Domains may use this plugin **alone** or alongside **tabular-xlsx** — merge is a domain choice.

Example domain (not required): `productDescriptions` on **`sales-report`**.

---

## Types

Import **`ErrorDetail`** from [import-shared](../import-shared/SKILL.md) (`import/shared/import-error.types.ts`). JSONL errors **omit `worksheetName`**. **`rowNumber`** is the **1-based physical line** in the file.

```typescript
type JsonlPluginPhase = "parsing_lines";

type JsonlProcessingProgress = {
  phase: JsonlPluginPhase;
  sourceId: string;
  originalName?: string;
  percent?: number;
};

type JsonlParseContext = { sourceId: string; label?: string };
```

---

## Parse behavior

| Input | Behavior |
| ----- | -------- |
| Empty or whitespace-only line | **Skip** — no **`onLine`**, no **`pushError`** |
| Invalid JSON | **`pushError`** — **`rowNumber`**, **`rawData`** = line text (outer trim only) |
| JSON parses to non-object | **`pushError`** — one object per line required; `{}` is valid |
| Valid object line | Trim **top-level string** values once; pass **`record`** to **`onLine`** |
| Line endings | Split on `\n`; strip trailing `\r` (CRLF) |
| UTF-8 | Strip BOM on first line only when present |
| **`rowNumber`** | **1-based physical line** (blank lines still increment the counter) |
| Progress | Optional **`onProgress(percent)`** — omit mid-stream **`percent`** when total unknown; **`100`** at EOF when lines were processed |

Domain **`onLine`** receives strings **as trimmed at ingest** — do not re-trim ([coding convention](../../../.cursor/rules/coding-convention.mdc)).

---

## Plugin API (sketch)

```typescript
async function parseJsonlLines(
  stream: Readable,
  ctx: JsonlParseContext,
  handlers: {
    onLine: (line: { rowNumber: number; record: Record<string, unknown> }) => void | Promise<void>;
    onProgress?: (percent: number) => Promise<void>;
    pushError: (detail: ErrorDetail) => void;
  },
): Promise<void>;

function scopeJsonlError(
  detail: ErrorDetail,
  scope: { sourceId: string; originalName?: string },
): ErrorDetail;

async function reportJsonlProgress(
  onProgress: ((detail: unknown) => Promise<void>) | undefined,
  phase: JsonlPluginPhase,
  sourceId: string,
  options?: { originalName?: string; percent?: number },
): Promise<void>;
```

**`parseJsonlLines`** applies **`scopeJsonlError`** for parse-time errors. Domain appends business **`ErrorDetail`** in **`onLine`**.

---

## Domain integration (example)

```typescript
const stream = await io.openStream(source);

await parseJsonlLines(stream, { sourceId: source.sourceId, label: source.label }, {
  pushError: (detail) => errors.push(detail),
  onProgress: async (percent) => {
    await reportJsonlProgress(io.onProgress, "parsing_lines", source.sourceId, {
      originalName: source.label,
      percent,
    });
  },
  onLine: async ({ rowNumber, record }) => {
    const message = validateRecord(record);
    if (message) {
      errors.push(
        scopeJsonlError(
          { message, rowNumber, rawData: JSON.stringify(record) },
          { sourceId: source.sourceId, originalName: source.label },
        ),
      );
    }
  },
});
```

Post-parse progress and error XLSX — domain uses [import-shared](../import-shared/SKILL.md).

---

## Progress

| Phase | Who emits | Helper |
| ----- | --------- | ------ |
| **`parsing_lines`** | **`parseJsonlLines`** (domain wraps **`onProgress`**) | **`reportJsonlProgress`** |
| **`validating_rows`**, **`saving_database`** | Domain runner | **`reportDomainProgress`** (import-shared) |

Same job may interleave **`TabularProcessingProgress`**, **`JsonlProcessingProgress`**, and **`DomainProcessingProgress`** — clients discriminate on **`phase`**.

---

## Suggested files

```text
import/plugins/jsonl/
  jsonl-processing.types.ts
  parse-jsonl-lines.ts
  scope-jsonl-errors.ts
  report-jsonl-progress.ts
```

---

## Checklist

```text
- [ ] Domain opens io.openStream; plugin receives Readable only
- [ ] ErrorDetail from import/shared — not from tabular-xlsx
- [ ] Blank lines skipped; invalid JSON / non-object → scoped ErrorDetail
- [ ] Plugin emits parsing_lines only; domain emits validating_rows / saving_database
- [ ] Domain builds error XLSX via import/shared — not this plugin
- [ ] No index.ts barrel re-exports
```

---

## Agent invocation

| Task | Skills |
| ---- | ------ |
| JSONL parse, parsing_lines progress | `import-plugin-jsonl` |
| Error type, error XLSX, domain progress | `import-shared` |
| Tabular parse (separate peer plugin) | `import-plugin-tabular-xlsx` |
| DomainRunner, SSE, job records | `async-processing` |
