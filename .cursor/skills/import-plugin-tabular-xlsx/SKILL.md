---
name: import-plugin-tabular-xlsx
description: >-
  Format plugins layer — tabular-xlsx: ExcelJS workbook load, headers, cell.text,
  row errors, TabularImportProgress, validation error XLSX. Use when implementing
  or extending import/plugins/tabular-xlsx for an async import upload slot.
---

# Format plugins layer — tabular-xlsx

Shared by all async `.xlsx` upload slots. See [async-processing](../async-processing/SKILL.md) for processing, domain, `ErrorDetail`, SSE, and outcomes. Upload is independent — see [import-batch-contract](../import-batch-contract/SKILL.md).

## When to use

- Any `.xlsx` slot in an async import (`import/plugins/tabular-xlsx/`).
- Building or extending the validation error XLSX from `ErrorDetail[]`.

## Must not

- BullMQ, Redis, `importKind` routing, business rules, DB models.

## Types

```typescript
type TabularImportPhase =
  | "parsing_workbook"
  | "validating_rows"
  | "saving_database";

/** Stored in JobMeta.progress when domain reports XLSX work */
type TabularImportProgress = {
  phase: TabularImportPhase;
  uploadSlotId: string;
  originalName?: string;
  worksheetName?: string;
  percent?: number;
};

type TabularSheetSpec = {
  sheetName: string;
  headers: readonly string[];
};
```

`ErrorDetail` is defined in async-processing (processing/domain contract).

## Responsibilities

| Concern | tabular-xlsx plugin |
| ------- | ------------------- |
| Load buffer into (ExcelJS) workbook | yes |
| Assert required sheet names exist | yes |
| Validate headers against `TabularSheetSpec` | yes |
| Read cells with **`cell.text`** (trim at ingest) | yes |
| Row loop, skip blank rows, `sourceRowNumber` | yes |
| Scoped error helper (attach slot / worksheet) | yes |
| Build validation error **XLSX** buffer from `ErrorDetail[]` | yes |

## Error XLSX columns

| Column | Include when |
| ------ | ------------ |
| Upload slot | any error has `uploadSlotId` |
| Original name | any error has `originalName` |
| Worksheet | any error has `worksheetName` |
| Row Number, Message, Raw Data | always |

Processing layer stores the buffer; this plugin builds it.

Domain passes `TabularSheetSpec`; plugin validates headers and yields raw row maps (batch) or calls a row callback (streaming).

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
  tabular-import.types.ts
  load-workbook.ts
  parse-sheet-rows.ts
  scope-import-errors.ts
  build-tabular-error-xlsx.ts
  report-tabular-progress.ts
```

## Checklist

```text
- [ ] Shared build-tabular-error-xlsx used on validation_failed
- [ ] Errors scoped with uploadSlotId / worksheetName at parse site
- [ ] cell.text + trim at ingest for string fields
```
