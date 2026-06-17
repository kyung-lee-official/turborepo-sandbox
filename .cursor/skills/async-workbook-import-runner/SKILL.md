---
name: async-workbook-import-runner
description: >-
  Three-layer async import architecture: (1) format-agnostic transport — slots,
  202, Redis, BullMQ, job phases, SSE progress; (2) tabular-xlsx — workbook load, row errors, error XLSX,
  tabular phase in progress; (3) domain — sheet maps, row transforms, persist.
  Use when adding async .xlsx imports, splitting transport from parsing, or
  designing reusable import abstractions.
---

# Async import: transport / tabular-xlsx / domain

## Goal

Reusable **async file-import jobs** where only the **bottom layer** is `importKind`-specific. **Layer 1** knows bytes and **job phase**. **Layer 2** knows Excel worksheets and row-level errors. **Layer 3** knows business tables and rules.

No universal “parse any file format” engine. No config-driven column DSL.

### Terminology (use consistently)

**Layer(s):** `1` Transport, `2` Tabular XLSX, `3` Domain. Bold marks the layer that **owns** the type or field; unbold numbers are layers that read or write it.

| Term | Layer(s) | Meaning |
| ---- | -------- | ------- |
| **importKind** | **1**, 3 | Registry key that selects a domain runner |
| **job** / **jobId** | **1** | One async import run |
| **job phase** | **1** | `JobMeta.phase`: `queued` \| `processing` \| `complete` \| `failed` |
| **JobMeta** | **1** | Redis record for a job (phase, progress, outcome) |
| **upload slot** | **1** | Named multipart field; identifies a file’s role |
| **uploadSlotId** | **1**, 2, 3 | Slot identifier; same string as the multipart field name |
| **ImportUpload** | **1**, 3 | One uploaded file: buffer + `uploadSlotId` + `originalName` |
| **progress** | **1**, 2, 3 | `JobMeta.progress`; runner-defined JSON (`unknown` at Layer 1) |
| **tabular phase** | **2** | `TabularImportProgress.phase`; XLSX-only value inside `progress` |
| **outcome** | **1**, 3 | `JobMeta.outcome` when job phase is `complete`: `success` \| `validation_failed` \| `failed` |
| **worker** | **1** | BullMQ processor that dequeues `{ jobId, importKind }`, resolves and invokes the domain runner; owns queue wiring, not parsing |  
| **domain runner** | **3**, 1 | `DomainImportRunner` for one `importKind`; registered at transport boundary; called by the worker, has no BullMQ/Redis knowledge |
| **originalName** | **1**, 2, 3 | Client filename; display only, never used for routing |
| **error blob** | **1**, 2 | Stored download bytes (Layer 2 builds XLSX; Layer 1 stores) |

**Do not mix:** job phase vs tabular phase; outcome vs job phase (`complete` ≠ `success`); `uploadSlotId` vs `originalName`; `JobMeta` vs informal “meta”.

---

## Three layers

```text
┌─────────────────────────────────────────────────────────────┐
│  Layer 1 — Transport        format-agnostic async file job   │
│  slots, 202/jobId, Redis, JobMeta, SSE, queue, lock policy │
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
│  sheet maps, row transforms, transactions, persist           │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Owns | Must not own |
| ----- | ---- | ------------ |
| **1 Transport** | `ImportUpload`, upload slots, `jobId`, **job phase**, opaque **progress**, **outcome**, error blob storage, **SSE progress stream**, lock policy, authz | Worksheets, row numbers, XLSX headers, DB models, progress shape (% vs tabular phase vs worksheet) |
| **2 Tabular XLSX** | Workbook load, required sheets, header validation, row loop, `ErrorDetail`, error XLSX columns, **tabular phase** in progress | BullMQ, Redis keys, `importKind` routing, business rules |
| **3 Domain** | Per-`importKind` sheet maps, row transforms, save strategy, domain runner | Queue wiring, multipart parsing, generic job TTL |

**Dependency rule:** Layer 3 may call Layer 2. Layer 2 may not call Layer 3. Layer 1 invokes Layer 3 only through a registered **domain runner**. Layer 1 never imports ExcelJS.

---

## When to use this skill

- Adding a new **async `.xlsx`** import.
- Splitting a monolithic processor into transport vs parse vs domain.
- Choosing where **`worksheetName`** and **error XLSX** live (Layer 2, not Layer 1).

---

## Layer 1 — Transport (format-agnostic)

### What is a slot?

An **upload slot** is a **named multipart field** on the POST body. Its **`uploadSlotId`** is the field name (e.g. `mainWorkbook`) — a stable routing key for which role each file plays. **`originalName`** is display-only and is never used for routing. A single-file import declares one slot in `UploadSlotSpec[]`; multi-file `importKind` values add more slots (e.g. `supplement`).

### Progress is opaque at Layer 1

Transport owns **job phase** (is the job still running?), not **progress** shape (how much work is done). Domain runners may put percent, tabular phase, or worksheet name inside `JobMeta.progress`; transport stores and relays it without interpreting it.

Each `importKind` documents its progress schema (often `TabularImportProgress` for XLSX). The client types `JobMeta.progress` per `importKind`, not in transport.

### Types

```typescript
type JobPhase = "queued" | "processing" | "complete" | "failed";

type ImportUpload = {
  uploadSlotId: string;  // multipart field name — routing key
  originalName: string;  // display only
  buffer: Buffer;
  mimeType?: string;     // optional; do not route by filename
};

type UploadSlotSpec = { uploadSlotId: string; required: boolean };

/** Job envelope — transport reads job phase only; progress is runner-defined */
type JobMeta = {
  phase: JobPhase;
  progress?: unknown;
  outcome?: "success" | "validation_failed" | "failed";
  errorBlobKey?: string;
};
```

**Rule:** routing uses **`uploadSlotId`**, never **`originalName`**. When job phase is **`complete`**, set **`outcome`** (`success` is not a job phase).

### POST

1. Resolve **`importKind`**.
2. Run **`ImportLockPolicy`**; reject with stable **`code`** if blocked.
3. Validate multipart against **`UploadSlotSpec[]`**.
4. Create `jobId`, `JobMeta` (`phase: queued`), store uploads per slot, enqueue `{ jobId, importKind }`, return **202** `{ jobId }`.

### Progress (SSE)

Client opens **`GET jobs/:jobId/events`** (`text/event-stream`) after POST. No polling endpoint for `JobMeta`.

1. Job store **`saveMeta`** writes Redis and **`publish`**es full `JobMeta` on `{prefix}:events:{jobId}` (same payload on every patch).
2. SSE sends current `JobMeta` on connect, then forwards pub/sub updates. Stream **closes** when `phase` is `complete` or `failed`.
3. Optional heartbeat events while open. Use a dedicated Redis subscriber connection per SSE client.

`GET jobs/:jobId/error-blob` when `outcome === "validation_failed"`.

### Worker

1. Load `Map<uploadSlotId, ImportUpload>`.
2. Resolve domain runner from registry by `importKind`.
3. Pass `onProgress(detail: unknown)` — patches `JobMeta.progress`, sets job phase to `processing` (pub/sub notifies SSE).
4. Map `DomainImportResult.outcome` to `JobMeta.outcome`; set job phase to `complete` (or `failed` on throw).
5. On outcome `validation_failed`, persist error blob (Layer 2 supplies XLSX bytes; transport stores bytes only).
6. Clear upload buffers per TTL policy.

### Lock policy (POST only)

| Policy | Guard |
| ------ | ----- |
| **None** | Always enqueue |
| **Global singleton** | No active run for this `importKind` |
| **Resource-scoped** | No active run for `(importKind, resourceKey)` |
| **Member-scoped** | Parallel jobs OK; isolate keys and authz by `actorId` |

Queue `concurrency: 1` does **not** replace POST guards across instances.

### Registry (transport boundary)

```typescript
registry.register("catalog", {
  domainRunner: catalogDomainRunner,
  uploadSlots: [{ uploadSlotId: "mainWorkbook", required: true }],
  lockPolicy: resourceScoped("resourceId"),
});
```

---

## Layer 2 — Tabular XLSX

Shared by all async XLSX `importKind` values. One module per app/package.

### Types (tabular progress — stored in `JobMeta.progress`, not transport)

```typescript
type TabularImportPhase =
  | "parsing_workbook"
  | "validating_rows"
  | "saving_database";

/** XLSX progress shape — lives in JobMeta.progress */
type TabularImportProgress = {
  phase: TabularImportPhase;
  uploadSlotId: string;
  originalName?: string;
  worksheetName?: string;
  percent?: number;
};

type ErrorDetail = {
  rowNumber?: number;
  message: string;
  rawData: string;
  uploadSlotId?: string;
  originalName?: string;
  worksheetName?: string;
};
```

### Responsibilities

| Concern | Layer 2 |
| ------- | ------- |
| Load buffer into (ExcelJS) workbook | yes |
| Assert required sheet names exist | yes |
| Validate headers against `TabularSheetSpec` | yes |
| Read cells with **`cell.text`** (trim at ingest) | yes |
| Row loop, skip blank rows, `sourceRowNumber` | yes |
| Scoped error helper (attach slot / worksheet) | yes |
| Build validation error **XLSX** buffer | yes |

### Error XLSX columns

| Column | Include when |
| ------ | ------------ |
| Upload slot | any error has `uploadSlotId` |
| Original name | any error has `originalName` |
| Worksheet | any error has `worksheetName` |
| Row Number, Message, Raw Data | always |

Transport **stores** the buffer; Layer 2 **builds** it.

### Tabular sheet spec (Layer 2)

```typescript
type TabularSheetSpec = {
  sheetName: string;
  headers: readonly string[];
};
```

Domain passes specs; Layer 2 validates headers and yields raw row maps (batch `Array`) or calls a row callback (streaming, one row at a time).

### Progress helper

```typescript
await reportTabularProgress(onProgress, "parsing_workbook", "mainWorkbook", {
  worksheetName: "Orders",
  originalName: file.originalName,
});
```

### Outcomes (domain runner → transport)

| Outcome | Valid rows in DB | Error blob |
| ------- | ---------------- | ---------- |
| `success` | all saved | none |
| `validation_failed` | partial save (default) | yes |
| `failed` (throw) | rollback if domain uses transaction | optional |

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
      onProgress: (detail: unknown) => Promise<void>;
    },
  ): Promise<DomainImportResult>;
};
```

### Internal split (within Layer 3)

| Artifact | Role |
| -------- | ---- |
| **Sheet specs** | Worksheet names, header literals, required sheets |
| **Orchestrator** | Parse order, fail-fast on missing sheets |
| **Row mapper** | Raw rows to domain DTOs; lookups and validation |
| **Saver** | Persist valid rows; optional transaction |

### Domain sketch

```typescript
async function run(uploads, ctx, { onProgress }) {
  const file = uploads.get("mainWorkbook");
  if (!file) throw new BadRequestException("Missing upload slot mainWorkbook");

  const workbook = await loadWorkbook(file.buffer);
  assertRequiredSheets(workbook, REQUIRED_SHEETS);

  const errors = createErrorCollector();
  const sheetErrors = scopeErrors(errors, {
    uploadSlotId: "mainWorkbook",
    originalName: file.originalName,
    worksheetName: "Orders",
  });

  await onProgress({ phase: "parsing_workbook", uploadSlotId: "mainWorkbook", worksheetName: "Orders" });

  const rows = parseOrdersSheet(workbook, sheetErrors);
  const records = mapRowsToRecords(rows, ctx, sheetErrors);

  await onProgress({ phase: "saving_database", uploadSlotId: "mainWorkbook" });
  const saved = await saveRecords(records, ctx);

  return errors.hasErrors()
    ? { outcome: "validation_failed", errors: errors.toList(), importedCount: saved, errorCount: errors.count }
    : { outcome: "success", importedCount: saved, errorCount: 0 };
}
```

Multi-sheet: loop domain sheet specs; call `onProgress` with each `worksheetName`. Multi-slot: read `uploads.get("supplement")` when the `importKind` defines two upload slots.

**Do not** put Redis, BullMQ, or queue types in Layer 3. NestJS HTTP exceptions (e.g. `BadRequestException`) for missing slots or invalid context are fine.

---

## Frontend

- **Layer 1:** `formData.append(uploadSlotId, file)` → POST → `EventSource` on `jobs/:jobId/events` (each event `data` is `JobMeta`); download error blob when `outcome === "validation_failed"`.
- **Per `importKind`:** type-narrow `JobMeta.progress` (e.g. `TabularImportProgress` for XLSX).
- Export `uploadSlotId` constants (e.g. `MAIN_WORKBOOK_SLOT = "mainWorkbook"`) beside the API client.

---

## Suggested module layout

```text
import/
  transport/              # Layer 1
    async-import.types.ts
    import-registry.ts
    import-transport.service.ts
    import-job-store.ts   # Redis meta, uploads, error blob; publish on saveMeta
    import-job-progress-sse.service.ts
    import.processor.ts   # queue worker
  tabular-xlsx/           # Layer 2
    tabular-import.types.ts
    load-workbook.ts
    parse-sheet-rows.ts
    scope-import-errors.ts
    build-tabular-error-xlsx.ts
    report-tabular-progress.ts

# Layer 3 — one module per importKind (path is app convention)
catalog-import/
  catalog.domain-runner.ts
```

---

## Registration checklist

```text
Layer 1
- [ ] UploadSlotSpec[] in API docs (named fields, not files[])
- [ ] Domain runner registered by importKind
- [ ] Lock policy + stable reject code
- [ ] Single processor — no per-`importKind` Redis duplicate
- [ ] JobMeta.progress is `unknown` — no transport union for progress shape
- [ ] SSE `jobs/:jobId/events` + Redis pub/sub on `saveMeta`; no poll endpoint for meta

Layer 2
- [ ] Shared error XLSX builder used on validation_failed
- [ ] Errors scoped with `uploadSlotId` / `worksheetName` at parse site
- [ ] cell.text + trim at ingest for string fields

Layer 3
- [ ] Sheet specs document worksheet names and header literals
- [ ] Missing required sheet throws before DB write
- [ ] Per-`importKind` notes: sheets and row rules (not transport)
```

---

## What not to do

| Anti-pattern | Why |
| ------------ | --- |
| Layer 1 imports ExcelJS | Couples transport to XLSX |
| Typed progress union in Layer 1 | Progress shape belongs in domain runner + client per `importKind` |
| Generic column-to-ORM mapper in Layer 2 | Belongs in Layer 3 or nowhere |
| Third copy of Redis service per `importKind` | Extend Layer 1 transport |
| Route uploads by filename | Use uploadSlotId |

**When to add Layer 1 + 2 formally:** first async import can start in one repo folder; extract when a second `importKind` shares the same transport or tabular code.
