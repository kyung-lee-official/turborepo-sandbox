# Sales import application

Business logic for merging three upload sources into **`SalesImportMergedLine`** rows. Domain-only — not under `import/plugins/`.

## Layer map

| Layer | Path | Role |
| --- | --- | --- |
| Tabular parse | `import/plugins/tabular-xlsx/` | `.xlsx` sheets to row maps |
| JSONL parse | `import/plugins/jsonl/` | Lines to JSON objects |
| Shared | `import/shared/` | `ErrorDetail`, domain progress, error export helpers |
| Job orchestration | `async-processing/` | Worker, `DomainRegistry`, SSE |
| Upload + start | `import/upload/local-multipart/`, `async-processing/start-processing-adapters/` | Multipart disk, session, `POST .../start` |
| Test fixtures | `sales-import-fixtures/` | Local bundle generator |

Skills for reusable layers: `.cursor/skills/`. **This folder uses this README only.**

---

## Registration (`sales-import.module.ts`)

| Field | Value |
| --- | --- |
| **`SALES_IMPORT_DOMAIN_KIND`** | `"sales-report"` |
| **`sourceSpecs`** | `salesData`, `inventory`, `productDescriptions` — see **`sales-import.constants.ts`** |
| **`lockPolicy`** | `global_singleton` |
| **`upload`** | MIME allowlists per `sourceId` — **`salesImportUploadPolicy`** |

Upload route: **`POST applications/async-processing/sales-report/upload`** (generic controller; no upload code in this folder).

**`DomainRunner.run(jobId, sources, io)`** — worker passes **`jobId`** for **`SalesImportMergedLine.processingJobId`**.

---

## Upload sources

| `sourceId` | File | Role |
| --- | --- | --- |
| **`salesData`** | `salesData.xlsx` | **Products** + **LineItems** worksheets |
| **`inventory`** | `inventory.xlsx` | **Inventory** sheet by SKU |
| **`productDescriptions`** | `productDescriptions.jsonl` | One object per catalog SKU |

Specs: **`sales-import.constants.ts`**, **`sales-import-merge.policy.ts`**.

---

## Merge model

**Base grain:** one output row per **LineItems** data row. Supplements joined by **`sku`** from Products (same workbook), inventory, JSONL.

| Output field | Source |
| --- | --- |
| `orderId`, `sku`, `quantity`, `saleDate` | LineItems |
| `productName`, `category`, `unitPrice` | Products |
| `inventoryQty` | inventory |
| `description` | JSONL |
| `sourceLineNumber` | 1-based LineItems Excel row |
| `processingJobId` | `jobId` from runner |

---

## Validation

Row-level rules → **`ErrorDetail`** (all rows evaluated):

| Rule | Result |
| --- | --- |
| Empty **`sku`** | Error |
| **`quantity`** ≤ 0 | Error |
| Invalid **`Sale Date`** | Error |
| Negative **`Unit Price`** | Error |
| Negative **`Inventory Qty`** | Allowed |
| SKU missing from Products / inventory / JSONL | Error |

Parse errors from format plugins before business validation.

---

## Persistence

Partial save: insert valid rows into **`SalesImportMergedLine`**. Any errors → **`validation_failed`** with **`errors[]`** persisted as **`ProcessingJobError`** rows. All pass → **`success`**.

Use **`Decimal`** for **`unitPrice`**.

---

## Module layout

```text
applications/sales-data/sales-import/
  sales-import.module.ts            # DomainRegistry.register on bootstrap
  sales-import.constants.ts         # sourceSpecs, sheet specs, upload policy
  sales-import-merge.policy.ts      # domain kind, source IDs, policy flags
  sales-import-domain.runner.ts     # DomainRunner
  sales-import-domain.validation.ts # merge + validate
```

---

## Test fixtures

Next.js **`/files/sales-import-fixtures`** → Nest **`applications/sales-data/sales-import-fixtures/generate-test-fixtures`**.

| Scenario | Expected outcome |
| --- | --- |
| **salesData-perfect.xlsx** | `success` |
| **salesData-partially_available.xlsx** | `validation_failed` |
| **salesData-fail_fast.xlsx** | `failed` (missing Products sheet) |

Shared bundle: perfect **inventory.xlsx** + **productDescriptions.jsonl**.

---

## Related skills

- `import-plugin-tabular-xlsx`, `import-plugin-jsonl`, `import-shared`
- `upload-local-multipart`, `start-processing-adapters`, `async-processing`
