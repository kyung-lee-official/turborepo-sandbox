---
name: import-plugin-tabular-xlsx
description: >-
  Format plugins layer — tabular-xlsx: ExcelJS workbook load, headers, cell.text,
  row errors, TabularProcessingProgress, validation error XLSX. Use when implementing
  or extending import/plugins/tabular-xlsx for an async `.xlsx` sourceId.
---

# Format plugins layer — tabular-xlsx

Shared by all async `.xlsx` sources. See [async-processing](../async-processing/SKILL.md) for processing records and SSE. Domain `ErrorDetail` — domain / plugin contract below. Upload handoff: [import-upload-handoff](../import-upload-handoff/SKILL.md).

## When to use

- Any `.xlsx` `sourceId` in async processing (`import/plugins/tabular-xlsx/`).
- Building or extending the validation error XLSX from `ErrorDetail[]`.

## Must not

- BullMQ, Redis, `domainKind` routing, business rules, DB models.

## Types

```typescript
type TabularProcessingPhase =
  | "parsing_workbook"
  | "validating_rows"
  | "saving_database";

/** Published via Redis during domainRunner.run — forwarded by SSE */
type TabularProcessingProgress = {
  phase: TabularProcessingPhase;
  sourceId: string;
  originalName?: string;
  worksheetName?: string;
  percent?: number;
};

type TabularSheetSpec = {
  sheetName: string;
  headers: readonly string[];
};

type ErrorDetail = {
  message: string;
  sourceId?: string;
  originalName?: string;
  worksheetName?: string;
  rowNumber?: number;
  rawData?: string;
};
```

## Responsibilities

| Concern | tabular-xlsx plugin |
| ------- | ------------------- |
| Load buffer into (ExcelJS) workbook | yes |
| Assert required sheet names exist | yes |
| Validate headers against `TabularSheetSpec` | yes |
| Read cells with **`cell.text`** (trim at ingest) | yes |
| Row loop, skip blank rows, `sourceRowNumber` | yes |
| Scoped error helper (attach `sourceId` / worksheet) | yes |
| Build validation error **XLSX** buffer from `ErrorDetail[]` | yes |

## Error XLSX columns

| Column | Include when |
| ------ | ------------ |
| Source | any error has `sourceId` |
| Original name | any error has `originalName` |
| Worksheet | any error has `worksheetName` |
| Row Number, Message, Raw Data | always |

Processing layer stores the buffer; this plugin builds it.

Domain passes `TabularSheetSpec`; plugin validates headers and yields raw row maps (chunk) or calls a row callback (streaming).

### Progress helper

```typescript
await reportTabularProgress(onProgress, "parsing_workbook", "mainWorkbook", {
  worksheetName: "Orders",
  originalName: file.originalName,
});
```

## Suggested files

```text
import/plugins/tabular-xlsx/
  tabular-processing.types.ts
  load-workbook.ts
  parse-sheet-rows.ts
  scope-processing-errors.ts
  build-tabular-error-xlsx.ts
  report-tabular-progress.ts
```

## Checklist

```text
- [ ] Shared build-tabular-error-xlsx used on validation_failed
- [ ] Errors scoped with sourceId / worksheetName at parse site
- [ ] cell.text + trim at ingest for string fields
```
