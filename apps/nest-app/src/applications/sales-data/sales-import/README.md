# Sales import application

Business logic for merging three upload sources into **`SalesImportMergedLine`** rows. Domain-only — not under `import/plugins/`.

Architecture guide for reusable layers: [`docs/how-to-build-a-async-processing-system/`](../../../../../../docs/how-to-build-a-async-processing-system/README.md). **This folder uses this README only.**

---

## Layer map

| Layer | Path | Role |
| --- | --- | --- |
| Tabular parse | `import/plugins/tabular-xlsx/` | `.xlsx` sheets to row maps |
| JSONL parse | `import/plugins/jsonl/` | Lines to JSON objects |
| Shared | `import/shared/` | `ErrorDetail`, domain progress, error export helpers |
| Job orchestration | `async-processing/` | Worker, `DomainRegistry`, SSE |
| Upload + start | `import/upload/local-multipart/`, `import/upload/object-store/`, `async-processing/start-processing-adapters/` | Multipart disk, S3/COS/Aliyun OSS direct, session, `POST .../start` |
| Test fixtures | `sales-import-fixtures/` | Local bundle generator |

---

## Registration (`sales-import.module.ts`)

| Field | Value |
| --- | --- |
| **`SALES_IMPORT_DOMAIN_KIND`** | `"sales-report"` |
| **`sourceSpecs`** | `salesData`, `inventory`, `productDescriptions` — see **`sales-import.constants.ts`** |
| **`lockPolicy`** | `global_singleton` |
| **`upload`** | MIME allowlists per `sourceId` — **`salesImportUploadPolicy`** |

Upload routes (generic controllers; no upload code in this folder):

- **`POST applications/async-processing/sales-report/upload`** — local multipart disk
- **`POST applications/async-processing/sales-report/upload/s3/initiate|complete`** — S3 presigned PUT
- **`POST applications/async-processing/sales-report/upload/cos/initiate|complete`** — Tencent COS scoped STS
- **`POST applications/async-processing/sales-report/upload/aliyun-oss/initiate|complete`** — Aliyun OSS presigned PUT

All object-store paths return **`{ uploadSessionId }`** on complete; client calls **`POST applications/async-processing/start`**.

Job API (Layer 3): **`GET jobs`**, **`GET jobs/:jobId`**, **`GET jobs/:jobId/events`**, **`GET jobs/:jobId/errors`**.

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

## Related guide chapters

- [Layer 4 — Domain business](../../../../../../docs/how-to-build-a-async-processing-system/04-domain-business-layer/README.md)
- [Layer 5 — import plugins](../../../../../../docs/how-to-build-a-async-processing-system/05-import-plugin-support-layer/README.md)
- [Layer 1 — upload](../../../../../../docs/how-to-build-a-async-processing-system/01-optional-upload-layer/README.md)
- [Layer 2 — start adapters](../../../../../../docs/how-to-build-a-async-processing-system/02-start-processing-adapter-layer/README.md)
- [Layer 3 — async core](../../../../../../docs/how-to-build-a-async-processing-system/03-async-processing-core-layer/README.md)
