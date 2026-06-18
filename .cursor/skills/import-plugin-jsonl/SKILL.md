---
name: import-plugin-jsonl
description: >-
  Format plugins layer — jsonl: line-delimited JSON parse, JsonlImportProgress,
  line-level errors. Use when implementing import/plugins/jsonl for an async
  import upload slot (.jsonl / application/x-ndjson).
---

# Format plugins layer — jsonl

Shared by all async JSONL upload slots. See [async-processing](../async-processing/SKILL.md) for processing, domain, `ErrorDetail`, SSE, and outcomes. See [import-batch-contract](../import-batch-contract/SKILL.md) for upload handoff. See [import-plugin-tabular-xlsx](../import-plugin-tabular-xlsx/SKILL.md) for merged validation error XLSX.

## When to use

- Line-delimited JSON upload slots (`.jsonl`, `application/x-ndjson`).
- Implementing `import/plugins/jsonl/` (e.g. `productDescriptions` on `sales-import`).

## Must not

- BullMQ, Redis, `importKind` routing, business rules, DB models.

## Types

```typescript
type JsonlImportPhase =
  | "parsing_lines"
  | "validating_rows"
  | "saving_database";

type JsonlImportProgress = {
  phase: JsonlImportPhase;
  uploadSlotId: string;
  originalName?: string;
  percent?: number;
};
```

`ErrorDetail` is defined in async-processing. Set `rowNumber` to the 1-based source line; omit `worksheetName`.

## Responsibilities

| Concern | jsonl plugin |
| ------- | ------------ |
| Stream or batch lines from buffer | yes |
| Parse one JSON object per line | yes |
| Trim string fields at ingest | yes |
| `sourceLineNumber` on each record | yes |
| Scoped `ErrorDetail` (slot, `originalName`) | yes |
| Build separate JSONL error download | no |

On `validation_failed`, domain merges all `ErrorDetail[]` and calls tabular-xlsx **build-tabular-error-xlsx** for the single error blob.

Large files: prefer line callback or batching (mirror tabular-xlsx streaming option).

### Progress helper (sketch)

```typescript
await reportJsonlProgress(onProgress, "parsing_lines", "productDescriptions", {
  originalName: file.originalName,
  percent: 42,
});
```

## Suggested files

```text
import/plugins/jsonl/
  jsonl-import.types.ts
  parse-jsonl-lines.ts
  report-jsonl-progress.ts
```

Share `scope-import-errors` with tabular-xlsx when practical.

## Checklist

```text
- [ ] Trim string fields once at line ingest
- [ ] rowNumber set to source line number on errors
- [ ] No worksheetName on JSONL errors
- [ ] Domain merges errors into tabular-xlsx error XLSX
```
