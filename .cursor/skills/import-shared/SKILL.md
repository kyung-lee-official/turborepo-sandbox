---
name: import-shared
description: >-
  Shared import layer — ErrorDetail, validation error XLSX export, domain post-parse
  progress. Used by format plugins and domain runners; not tied to xlsx or jsonl parsing.
---

# Import shared layer

Cross-format utilities under **`apps/nest-app/src/import/shared/`** (no barrel **`index.ts`** — import concrete files).

Format plugins (**tabular-xlsx**, **jsonl**) are **peer, business-agnostic parsers**. This folder holds types and helpers **neither plugin should own**.

---

## Scope

| This layer owns                      | Format plugins own                                          | Domain runners own                                                          |
| ------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| **`ErrorDetail`** shape              | Parse uploaded files into generic rows/lines                | Business validation, persistence, **`DomainRunResult`**                     |
| **`buildValidationErrorXlsxBuffer`** | Plugin parse progress (`parsing_workbook`, `parsing_lines`) | **`validating_rows`**, **`saving_database`** via **`reportDomainProgress`** |
| **`DomainProcessingProgress`**       | Scoped parse errors per format                              | Which plugins to call, error collection, outcome                            |

---

## Types

```typescript
type ErrorDetail = {
  message: string;
  sourceId?: string;
  originalName?: string;
  worksheetName?: string; // tabular sources only
  rowNumber?: number;
  rawData?: string;
};

type DomainProcessingPhase = "validating_rows" | "saving_database";

type DomainProcessingProgress = {
  phase: DomainProcessingPhase;
  sourceId: string;
  originalName?: string;
  worksheetName?: string;
  percent?: number;
};
```

---

## API (sketch)

```typescript
async function buildValidationErrorXlsxBuffer(
  errors: readonly ErrorDetail[],
): Promise<Buffer>;

async function reportDomainProgress(
  onProgress: ((detail: unknown) => Promise<void>) | undefined,
  phase: DomainProcessingPhase,
  sourceId: string,
  options?: { originalName?: string; worksheetName?: string; percent?: number },
): Promise<void>;
```

**`VALIDATION_ERROR_XLSX_CONTENT_TYPE`** — MIME for error download blobs.

Error XLSX columns (dynamic): Source, Original Name, Worksheet (when present), Row Number, Message, Raw Data. Freeze header row and enable auto-filter on the error sheet.

---

## Domain integration

When validation fails, the **domain runner** (not a format plugin) builds the error blob:

```typescript
import { buildValidationErrorXlsxBuffer } from "../../shared/build-validation-error-xlsx";
import type { ErrorDetail } from "../../shared/import-error.types";

const errors: ErrorDetail[] = [...parseErrorsFromAllSources];

if (errors.length > 0) {
  const errorBlob = await buildValidationErrorXlsxBuffer(errors);
  return {
    outcome: "validation_failed",
    processedCount,
    errorCount: errors.length,
    errorBlob,
  };
}
```

Domains may use **one format only** (xlsx-only or jsonl-only) or **combine** several plugins — merge is a domain choice, not a plugin requirement.

Post-parse progress:

```typescript
await reportDomainProgress(io.onProgress, "validating_rows", source.sourceId, {
  originalName: source.label,
  worksheetName: sheetSpec.sheetName,
  percent: 60,
});
```

---

## Suggested files

```text
import/shared/
  import-error.types.ts
  build-validation-error-xlsx.ts
  apply-exported-sheet-view.ts
  domain-processing.types.ts
  report-domain-progress.ts
```

---

## Agent invocation

| Task                                           | Skills                       |
| ---------------------------------------------- | ---------------------------- |
| Shared error type, error XLSX, domain progress | `import-shared`              |
| XLSX parse                                     | `import-plugin-tabular-xlsx` |
| JSONL parse                                    | `import-plugin-jsonl`        |
| Job orchestration, error blob storage          | `async-processing`           |
