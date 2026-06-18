---
name: async-processing
description: >-
  Async import processing layer: startProcessing, job queue, JobMeta, SSE, locks,
  worker, domain registry. Upload-agnostic — requires ready ImportBatch. Use when
  adding importKind runners, job orchestration, or wiring processing to domain.
---

# Async import: processing / format plugins / domain

## Goal

Reusable **async file-import jobs** where only the **domain layer** is `importKind`-specific. **Processing layer** knows **job phase** and orchestration only — not how files were uploaded. **Format plugins layer** knows file-shape parsing. **Domain layer** knows business tables and rules.

**Inbound contract:** [import-batch-contract](../import-batch-contract/SKILL.md) — `ImportBatch`, registry, slot reader. Processing starts only from a **ready** batch via **`startProcessing`**.

No universal “parse any file format” engine. No config-driven column DSL.

### Terminology

**Area:** `Contract`, `Processing`, `Format plugins`, `Domain`. Bold marks the owner.

| Term | Area | Meaning |
| ---- | ---- | ------- |
| **ImportBatch** | **Contract**, Processing | Inbound handoff: slots + `ImportBatchSource` refs |
| **batchId** | **Contract**, Processing | Id from upload path; passed to `startProcessing` |
| **importKind** | **Processing**, **Domain** | Registry key that selects a domain runner |
| **job** / **jobId** | **Processing** | One async import run |
| **job phase** | **Processing** | `JobMeta.phase`: `queued` \| `processing` \| `complete` \| `failed` |
| **JobMeta** | **Processing** | Redis record for a job (phase, progress, outcome) |
| **uploadSlotId** | Contract, Format plugins, Domain | Slot routing key |
| **progress** | Processing, Format plugins, Domain | `JobMeta.progress`; runner-defined JSON (`unknown` in processing) |
| **outcome** | **Processing**, **Domain** | `JobMeta.outcome` when job phase is `complete` |
| **worker** | **Processing** | BullMQ processor; dequeues `{ jobId, importKind, batchId }` |
| **domain runner** | **Domain**, Processing | `DomainImportRunner` for one `importKind` |
| **originalName** | Contract, Format plugins, Domain | Display only; never used for routing |
| **error blob** | **Processing**, Format plugins | Download bytes (tabular-xlsx builds XLSX; processing stores) |
| **plugin id** | **Format plugins** | `tabular-xlsx`, `jsonl` (not `importKind`) |

**Do not mix:** job phase vs plugin progress phase; outcome vs job phase (`complete` ≠ `success`); `importKind` vs plugin id; upload progress vs job SSE.

---

## Architecture

```text
[Upload paths]  ──registerReady──►  ImportBatch (contract)
                                           │
                              startProcessing(batchId, importKind)
                                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Processing layer     jobId, queue, JobMeta, SSE, locks     │
└──────────────────────────────┬───────────────────────────────┘
                               │ domain runner
┌──────────────────────────────▼───────────────────────────────┐
│  Domain layer (per importKind)                                  │
└──────────────────────────────┬─────────────────────────────────┘
                               │ per uploadSlotId
┌──────────────────────────────▼───────────────────────────────┐
│  Format plugins layer                                           │
└──────────────────────────────────────────────────────────────┘
```

| Area | Owns | Must not own |
| ---- | ---- | ------------ |
| **Contract** | `ImportBatch`, registry, slot reader | BullMQ, `importKind`, multipart, presigned URLs |
| **Processing** | `jobId`, **job phase**, opaque **progress**, **outcome**, error blob storage, **SSE**, lock policy, `startProcessing` | Multipart, object-store grants, file bytes in Redis, worksheets, DB models |
| **Format plugins** | Parse, `ErrorDetail`, error XLSX build | Queue, `importKind`, business rules |
| **Domain** | Orchestration, transforms, save strategy | Upload flows, queue wiring |

**Dependency rule:** Upload paths call contract `registerReady` only. Processing invokes domain runner. Domain may call format plugins. Format plugins must not call domain or processing. Processing must not import format plugins or ExcelJS.

**Plugin skills:** [import-plugin-tabular-xlsx](../import-plugin-tabular-xlsx/SKILL.md) · [import-plugin-jsonl](../import-plugin-jsonl/SKILL.md)

---

## When to use this skill

- Adding a new async import (`importKind`).
- `startProcessing`, SSE, registry, lock policy, worker, domain runner wiring.
- Choosing what lives in domain vs format plugins.

For upload mechanisms, slot verification, and `registerReady`, use [import-batch-contract](../import-batch-contract/SKILL.md) and the upload skills.

---

## Processing layer

### Progress is opaque in processing

Processing owns **job phase** (is the job still running?), not **progress** shape. Domain runners put plugin-specific detail in `JobMeta.progress`; processing stores and relays without interpreting it.

Each `importKind` documents its progress schema on the client. Processing types `JobMeta.progress` as `unknown`.

### Types

```typescript
type JobPhase = "queued" | "processing" | "complete" | "failed";

type UploadSlotSpec = { uploadSlotId: string; required: boolean };

type JobMeta = {
  jobId: string;
  importKind: string;
  batchId: string;
  phase: JobPhase;
  progress?: unknown;
  outcome?: "success" | "validation_failed" | "failed";
  errorBlobKey?: string;
  importedCount?: number;
  errorCount?: number;
  createdAt: string;
  updatedAt: string;
};

type AsyncImportJobPayload = {
  jobId: string;
  importKind: string;
  batchId: string;
};
```

Import batch types (`ImportBatch`, `ImportBatchSlot`, `ImportBatchSource`) live in [import-batch-contract](../import-batch-contract/SKILL.md).

### startProcessing (sole entry from upload)

```http
POST /applications/async-import/batches/:batchId/start
Content-Type: application/json

{ "importKind": "sales-import" }
```

→ **202** `{ "jobId": "..." }`

1. Load `ImportBatch` by `batchId`; reject if missing, not `ready`, or expired.
2. Resolve `importKind` from `ImportRegistry`; validate batch slots against `uploadSlots`.
3. Run `ImportLockPolicy`; reject with stable `code` if blocked.
4. Create `jobId`, `JobMeta` (`phase: queued`, `batchId`).
5. `claimByJobId(batchId, jobId)`; reject if claim fails.
6. Enqueue `{ jobId, importKind, batchId }`.
7. Return `{ jobId }`.

Processing **never** accepts multipart or presigned grants on this endpoint.

### Progress (SSE)

Client opens **`GET jobs/:jobId/events`** after `startProcessing`. No polling endpoint for `JobMeta`.

1. Job store **`saveMeta`** writes Redis and **`publish`**es full `JobMeta` on `{prefix}:events:{jobId}`.
2. SSE sends current `JobMeta` on connect, then forwards pub/sub updates. Stream **closes** when `phase` is `complete` or `failed`.
3. Optional heartbeat. Dedicated Redis subscriber per SSE client.

`GET jobs/:jobId/error-blob` when `outcome === "validation_failed"`.

### Worker

1. Load `ImportBatch`; assert `claimedByJobId === jobId`.
2. Build `Map<uploadSlotId, ImportBatchSlot>`.
3. Resolve domain runner by `importKind`.
4. Call `domainRunner.run(slots, { openStream, onProgress })`:
   - `openStream(slot)` uses `ImportBatchSlotReader.openReadStream(slot.source)`.
   - `onProgress` patches `JobMeta.progress`, sets job phase to `processing`.
5. Map `DomainImportResult.outcome` to `JobMeta.outcome`; set job phase to `complete` (or `failed` on throw).
6. On `validation_failed`, persist error blob (format plugin supplies bytes; processing stores only).
7. `deleteSource` for each slot; clear active lock if needed.

### Lock policy (startProcessing only)

| Policy | Guard |
| ------ | ----- |
| **None** | Always enqueue |
| **Global singleton** | No active run for this `importKind` |
| **Resource-scoped** | No active run for `(importKind, resourceKey)` |
| **Member-scoped** | Parallel jobs OK; isolate by `actorId` |

Queue `concurrency: 1` does **not** replace POST guards across instances.

### Registry

```typescript
registry.register("catalog", {
  domainRunner: catalogDomainRunner,
  uploadSlots: [{ uploadSlotId: "mainWorkbook", required: true }],
  lockPolicy: resourceScoped("resourceId"),
});
```

`uploadSlots` validates the **batch** at `startProcessing`, not multipart at upload time.

---

## Format plugins layer

One plugin per **format family** under `import/plugins/{id}/`. Plugins are **`importKind`-agnostic**; domain picks a plugin per **`uploadSlotId`**.

**Shared `ErrorDetail` contract:**

```typescript
type ErrorDetail = {
  rowNumber?: number;
  message: string;
  rawData: string;
  uploadSlotId?: string;
  originalName?: string;
  worksheetName?: string;
};
```

On `validation_failed`, domain merges `ErrorDetail[]` into one **XLSX** error blob (tabular-xlsx plugin builds; processing stores).

| Slot format | Plugin skill |
| ----------- | ------------ |
| `.xlsx` | [import-plugin-tabular-xlsx](../import-plugin-tabular-xlsx/SKILL.md) |
| `.jsonl` | [import-plugin-jsonl](../import-plugin-jsonl/SKILL.md) |

---

## Domain layer

One **domain runner** per `importKind`. Composes format plugins; implements business logic only.

### Interface (called by worker)

```typescript
type DomainImportResult =
  | { outcome: "success"; importedCount: number; errorCount: 0 }
  | {
      outcome: "validation_failed";
      errors: ErrorDetail[];
      importedCount: number;
      errorCount: number;
      errorBlob?: Buffer;
    };

type DomainImportRunner = {
  importKind: string;
  run(
    slots: Map<string, ImportBatchSlot>,
    io: {
      openStream: (slot: ImportBatchSlot) => Promise<Readable>;
      onProgress: (detail: unknown) => Promise<void>;
    },
  ): Promise<DomainImportResult>;
};
```

`ImportBatchSlot` is defined in [import-batch-contract](../import-batch-contract/SKILL.md).

### Domain sketch

```typescript
async function run(slots, { openStream, onProgress }) {
  const slot = slots.get("mainWorkbook");
  if (!slot) throw new BadRequestException("Missing slot mainWorkbook");

  const stream = await openStream(slot);
  const workbook = await loadWorkbookFromStream(stream);
  assertRequiredSheets(workbook, REQUIRED_SHEETS);

  const errors = createErrorCollector();
  const sheetErrors = scopeErrors(errors, {
    uploadSlotId: "mainWorkbook",
    originalName: slot.originalName,
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

**Do not** put Redis, BullMQ, or upload-store types in the domain layer.

### Outcomes

| Outcome | Valid rows in DB | Error blob |
| ------- | ---------------- | ---------- |
| `success` | all saved | none |
| `validation_failed` | partial save (default) | yes |
| `failed` (throw) | rollback if domain uses transaction | optional |

---

## Frontend

1. Complete upload path for the environment → `{ batchId }` (upload progress from that path only).
2. `POST .../batches/:batchId/start` with `{ importKind }` → `{ jobId }`.
3. `EventSource` on `jobs/:jobId/events` (`JobMeta`) until `complete` or `failed`.
4. Download error blob when `outcome === "validation_failed"`.
5. Type-narrow `JobMeta.progress` per `importKind` on the client.

---

## Suggested module layout

```text
import/
  contract/
    import-batch.types.ts
    import-batch.registry.ts
    import-batch-slot.reader.ts
  processing/
    async-import.types.ts
    import-registry.ts
    processing-orchestrator.service.ts
    import-job-store.service.ts
    import-job-progress-sse.service.ts
    import.processor.ts
  plugins/
    tabular-xlsx/
    jsonl/
upload/
  local-multipart/
  s3-direct/
  cos-direct/
applications/
  sales-import/
    sales-import.domain-runner.ts
```

---

## Registration checklist

```text
Contract + upload
- [ ] Upload path calls registerReady; returns batchId
- [ ] UploadSlotSpec[] documented per importKind (named fields)

Processing
- [ ] Domain runner registered by importKind
- [ ] startProcessing validates batch + claimByJobId before enqueue
- [ ] Lock policy + stable reject code
- [ ] Single processor — no per-importKind Redis duplicate
- [ ] JobMeta.progress is unknown
- [ ] SSE jobs/:jobId/events + Redis pub/sub on saveMeta
- [ ] Worker deletes ImportBatchSource after terminal state

Domain
- [ ] Sheet / line specs document literals
- [ ] openStream at slot boundary; no assumption of upload mechanism
- [ ] Picks format plugin per uploadSlotId
```

---

## What not to do

| Anti-pattern | Why |
| ------------ | --- |
| Multipart or presigned URL on startProcessing | Upload belongs to upload paths |
| File bytes in Redis job store | Use ImportBatchSource + slot reader |
| One unified upload workflow for local and S3 | Different client flows; share contract only |
| Processing imports ExcelJS | Couples processing to XLSX |
| Typed progress union in processing | Progress shape is per importKind on client |
| Route by filename | Use `uploadSlotId` |

---

## Agent invocation

| Task | Skills |
| ---- | ------ |
| ImportBatch, registry, reader | `import-batch-contract` |
| startProcessing, worker, SSE, new `importKind` | `async-processing` |
| Local / S3 / COS upload | upload skills + `import-batch-contract` |
| XLSX parse / error XLSX | `import-plugin-tabular-xlsx` |
| JSONL parse | `import-plugin-jsonl` |
| End-to-end `sales-import` | contract + processing + upload + plugins |
