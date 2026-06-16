---
name: async-workbook-import-runner
description: >-
  Three-layer async import architecture: (1) format-agnostic transport — slots,
  202, Redis, BullMQ, job phases; (2) tabular-xlsx — workbook load, row errors,
  error XLSX, worksheet progress; (3) domain — sheet maps, enrich, persist.
  Use when adding async .xlsx imports, splitting transport from parsing, or
  designing reusable import abstractions. Async only — not sync HTTP 207.
---

# Async import: transport / tabular-xlsx / domain

## Goal

Reusable **async file-import jobs** where only the **bottom layer** is feature-specific. **Layer 1** knows bytes and job lifecycle. **Layer 2** knows Excel worksheets and row-level errors. **Layer 3** knows business tables and rules.

No universal “parse any file format” engine. No config-driven column DSL.

---

## Three layers

```text
┌─────────────────────────────────────────────────────────────┐
│  Layer 1 — Transport        format-agnostic async file job   │
│  slots, 202/jobId, Redis, queue, lock policy, job meta      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Map<uploadSlotId, ImportUpload>
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2 — Tabular XLSX     .xlsx worksheets + row errors  │
│  load workbook, headers, cell.text, ErrorDetail, error XLSX  │
└──────────────────────────────┬──────────────────────────────┘
                               │ typed row[] + errors
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3 — Domain           business data shape + persist  │
│  sheet maps, enrich, transactions, createMany/deleteMany     │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Owns | Must not own |
| ----- | ---- | ------------ |
| **1 Transport** | `ImportUpload`, upload slots, `jobId`, phased **job** meta, outcomes, error **blob** storage, lock policy, authz | Worksheets, row numbers, XLSX headers, DB models |
| **2 Tabular XLSX** | Workbook load, required sheets, header validation, row loop, `ErrorDetail`, error **XLSX** columns, `worksheetName` in progress | BullMQ, Redis keys, `importKind` routing, business rules |
| **3 Domain** | Per-feature sheet maps, enrichment, save strategy, `importKind` runner | Queue wiring, multipart parsing, generic job TTL |

**Dependency rule:** Layer 3 may call Layer 2. Layer 2 may not call Layer 3. Layer 1 calls Layer 3 only through a **registered runner** interface. Layer 1 never imports ExcelJS.

---

## When to use this skill

- Adding a new **async `.xlsx`** import.
- Splitting a monolithic processor into transport vs parse vs domain.
- Choosing where **`worksheetName`** and **error XLSX** live (Layer 2, not Layer 1).

**Out of scope:** synchronous partial-success **HTTP 207** uploads.

---

## Layer 1 — Transport (format-agnostic)

### Types

```typescript
type AsyncImportPhase =
  | "queued"
  | "processing"   // or map tabular phases in meta.progress.phase only
  | "complete";

type ImportUpload = {
  uploadSlotId: string;  // multipart field name — routing key
  originalName: string;  // display only
  buffer: Buffer;
  mimeType?: string;     // optional; do not route by filename
};

type UploadSlotSpec = { fieldName: string; required: boolean };

/** Job-level progress — no worksheet fields */
type AsyncImportProgress = {
  phase: string;
  uploadSlotId: string;
  displayFileName?: string;
};
```

For XLSX imports, store **tabular detail** in `meta.progress` (Layer 2 shape). Transport treats `progress` as opaque JSON except `phase` and `uploadSlotId`.

**Rule:** routing uses **`uploadSlotId`**, never `originalName`.

### POST

1. Resolve **`importKind`**.
2. Run **`ImportLockPolicy`**; reject with stable **`code`** if blocked.
3. Validate multipart against **`UploadSlotSpec[]`**.
4. Create `jobId`, Redis meta (`phase: queued`), store uploads per slot, enqueue `{ jobId, importKind }`, return **202** `{ jobId }`.

### Worker

1. Load `Map<uploadSlotId, ImportUpload>`.
2. Resolve **domain runner** from registry by `importKind`.
3. Pass hooks: `onProgress(detail)` patches Redis meta; `onJobPhase` optional for coarse transport phase.
4. Map runner result to `success` | `validation_failed` | `failed`.
5. On `validation_failed`, persist error **blob** (Layer 2 supplies XLSX bytes; transport stores bytes only).
6. Clear upload blobs per TTL policy.

### Lock policy (POST only)

| Policy | Guard |
| ------ | ----- |
| **None** | Always enqueue |
| **Global singleton** | No active run for this `importKind` |
| **Resource-scoped** | No active run for `(importKind, resourceKey)` |
| **Member-scoped** | Parallel jobs OK; isolate keys and authz by `memberId` |

Queue `concurrency: 1` does **not** replace POST guards across instances.

### Registry (transport boundary)

```typescript
registry.register("inventory", {
  domainRunner: inventoryDomainRunner,
  slots: [{ fieldName: "mainWorkbook", required: true }],
  lockPolicy: resourceScoped("warehouseId"),
});
```

---

## Layer 2 — Tabular XLSX

Shared by **all** async XLSX import kinds. One module per app/package.

### Types

```typescript
type TabularImportPhase =
  | "parsing_workbook"
  | "validating_rows"
  | "saving_database";

type TabularImportProgress = {
  phase: TabularImportPhase;
  uploadSlotId: string;
  workbookDisplayName?: string;
  worksheetName?: string;
};

type ErrorDetail = {
  rowNumber?: number;
  message: string;
  rawData: string;
  uploadSlotId?: string;
  workbookDisplayName?: string;
  worksheetName?: string;
};
```

### Responsibilities

| Concern | Layer 2 |
| ------- | ------- |
| Load buffer into workbook | yes |
| Assert required sheet names exist | yes |
| `validateWorksheetHeaders` + Zod/header enum | yes |
| Read cells with **`cell.text`** (trim at ingest) | yes |
| Row loop, skip blank rows, `sourceRowNumber` | yes |
| Scoped error helper (attach slot / worksheet) | yes |
| Build validation error **XLSX** buffer | yes |

### Error XLSX columns

| Column | Include when |
| ------ | ------------ |
| Upload slot | any error has `uploadSlotId` |
| Workbook | any error has `workbookDisplayName` |
| Worksheet | any error has `worksheetName` |
| Row Number, Message, Raw Data | always |

Transport **stores** the buffer; Layer 2 **builds** it.

### Tabular sheet spec (Layer 2)

```typescript
type TabularSheetSpec = {
  sheetName: string;
  headers: readonly string[];
  warehouseColumn?: string;  // example: domain-agnostic column id
};
```

Domain passes specs; Layer 2 validates headers and yields raw row maps or calls a row callback.

### Progress helper

```typescript
await reportTabularProgress(onProgress, "parsing_workbook", "mainWorkbook", {
  worksheetName: "Orders",
  workbookDisplayName: file.originalName,
});
```

### Outcomes (tabular + domain handoff)

| Result | Valid rows in DB | Error XLSX |
| ------ | ---------------- | ---------- |
| success | all saved | none |
| validation_failed | partial save (default) | yes |
| failed (throw) | rollback if domain uses transaction | optional |

Default bulk import: **partial save + error XLSX**. Use a transaction in Layer 3 only when all-or-nothing is required.

---

## Layer 3 — Domain

One **domain runner** per `importKind`. Composes Layer 2 utilities; implements business logic only.

### Interface (called by transport worker)

```typescript
type DomainImportResult =
  | { outcome: "success"; importedCount: number; errorCount: 0 }
  | {
      outcome: "validation_failed";
      errors: ErrorDetail[];
      importedCount: number;
      errorCount: number;
    };

type DomainImportRunner<TContext> = {
  importKind: string;
  run(
    uploads: Map<string, ImportUpload>,
    ctx: TContext,
    hooks: {
      onProgress: (p: TabularImportProgress) => Promise<void>;
    },
  ): Promise<DomainImportResult>;
};
```

### Internal split (within Layer 3)

| Artifact | Role |
| -------- | ---- |
| **Static mappings** | Worksheet names, header literals, lookup tables |
| **Orchestrator** | Which sheets to parse, order, fail-fast on missing sheets |
| **Enricher** | Resolve IDs, categories, FX (optional) |
| **Saver** | `deleteMany` / `createMany`, transactions |

### Domain sketch

```typescript
async function run(uploads, ctx, { onProgress }) {
  const file = uploads.get("mainWorkbook");
  if (!file) throw new BadRequestException("Missing slot mainWorkbook");

  const workbook = await loadWorkbook(file.buffer);
  assertRequiredSheets(workbook, REQUIRED_SHEETS);

  const errors = createErrorCollector();
  const sheetErrors = scopeErrors(errors, {
    uploadSlotId: "mainWorkbook",
    workbookDisplayName: file.originalName,
    worksheetName: "Orders",
  });

  await onProgress({ phase: "parsing_workbook", uploadSlotId: "mainWorkbook", worksheetName: "Orders" });

  const rows = parseOrdersSheet(workbook, sheetErrors);
  const dtos = enrichOrders(rows, ctx, sheetErrors);

  await onProgress({ phase: "saving_database", uploadSlotId: "mainWorkbook" });
  const saved = await saveOrders(dtos, ctx);

  return errors.hasErrors()
    ? { outcome: "validation_failed", errors: errors.toList(), importedCount: saved, errorCount: errors.count }
    : { outcome: "success", importedCount: saved, errorCount: 0 };
}
```

Multi-sheet: loop domain sheet specs; call `onProgress` with each `worksheetName`. Multi-slot: read `uploads.get("supplement")` when the feature defines two slots.

**Do not** put Redis, BullMQ, or HTTP types in Layer 3.

---

## Frontend

- **Layer 1:** `formData.append(slot.fieldName, file)`, poll job meta, download error blob.
- **Layer 2 display:** format `progress` with worksheet + slot + display filename when present.
- Export slot constants (e.g. `MAIN_WORKBOOK_SLOT = "mainWorkbook"`) beside the API client.

---

## Suggested module layout

```text
import/
  transport/           # Layer 1
    async-import.types.ts
    import-registry.ts
    import-transport.service.ts
    import-redis.service.ts
    import.processor.ts
  tabular-xlsx/          # Layer 2
    tabular-import.types.ts
    load-workbook.ts
    parse-sheet-rows.ts
    scope-import-errors.ts
    build-tabular-error-xlsx.ts
    report-tabular-progress.ts
features/
  inventory-import/      # Layer 3 only
    inventory.domain-runner.ts
    static-mappings/
    enrich-*.ts
    save-*.ts
```

---

## Registration checklist

```text
Layer 1
- [ ] UploadSlotSpec[] in API docs (named fields, not files[])
- [ ] Domain runner registered by importKind
- [ ] Lock policy + stable reject code
- [ ] Single processor — no per-feature Redis duplicate

Layer 2
- [ ] Shared error XLSX builder used on validation_failed
- [ ] Errors scoped with slot/worksheet at parse site
- [ ] cell.text + trim at ingest for string fields

Layer 3
- [ ] Static mappings for sheet/header literals
- [ ] Missing required sheet throws before DB write
- [ ] Domain README: sheets, row rules (not transport)
```

---

## What not to do

| Anti-pattern | Why |
| ------------ | --- |
| Layer 1 imports ExcelJS | Couples transport to XLSX |
| “Any file format” progress union in Layer 1 | Worksheet vs page vs JSON path leaks |
| Generic column-to-ORM mapper in Layer 2 | Belongs in Layer 3 or nowhere |
| Third copy of Redis service per feature | Extend Layer 1 transport |
| Route uploads by filename | Use uploadSlotId |

**When to add Layer 1 + 2 formally:** first async import can start in one repo folder; extract when a **second** import kind shares the same transport or tabular code.
