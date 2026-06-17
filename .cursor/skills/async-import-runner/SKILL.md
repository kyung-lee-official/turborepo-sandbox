---
name: async-import-runner
description: >-
  Async import: transport layer (slots, 202, Redis, BullMQ, SSE), domain layer
  (per importKind runner), format plugins layer (tabular-xlsx, jsonl). Use when
  adding async imports or wiring transport to domain.
---

# Async import: transport / format plugins / domain

## Goal

Reusable **async file-import jobs** where only the **domain layer** is `importKind`-specific. **Transport layer** knows bytes and **job phase**. **Format plugins layer** knows file-shape parsing. **Domain layer** knows business tables and rules.

No universal “parse any file format” engine. No config-driven column DSL.

### Terminology (use consistently)

**Area:** `Transport`, `Format plugins`, `Domain`. Bold marks the area that **owns** the type or field.

| Term | Area | Meaning |
| ---- | ---- | ------- |
| **importKind** | **Transport**, **Domain** | Registry key that selects a domain runner |
| **job** / **jobId** | **Transport** | One async import run |
| **job phase** | **Transport** | `JobMeta.phase`: `queued` \| `processing` \| `complete` \| `failed` |
| **JobMeta** | **Transport** | Redis record for a job (phase, progress, outcome) |
| **upload slot** | **Transport** | Named multipart field; identifies a file’s role |
| **uploadSlotId** | Transport, Format plugins, Domain | Slot identifier; same string as the multipart field name |
| **ImportUpload** | Transport, Domain | One uploaded file: buffer + `uploadSlotId` + `originalName` |
| **progress** | Transport, Format plugins, Domain | `JobMeta.progress`; runner-defined JSON (`unknown` in transport) |
| **outcome** | **Transport**, **Domain** | `JobMeta.outcome` when job phase is `complete`: `success` \| `validation_failed` \| `failed` |
| **worker** | **Transport** | BullMQ processor; dequeues `{ jobId, importKind }`, invokes domain runner |
| **domain runner** | **Domain**, Transport | `DomainImportRunner` for one `importKind`; registered at transport boundary |
| **originalName** | Transport, Format plugins, Domain | Client filename; display only, never used for routing |
| **error blob** | **Transport**, Format plugins | Stored download bytes (tabular-xlsx plugin builds XLSX; transport stores) |
| **plugin id** | **Format plugins** | Format family key: `tabular-xlsx`, `jsonl` (not `importKind`) |

**Do not mix:** job phase vs plugin progress phase (e.g. `TabularImportProgress.phase` — see tabular-xlsx skill); outcome vs job phase (`complete` ≠ `success`); `importKind` vs plugin id; `uploadSlotId` vs `originalName`.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  Transport layer          format-agnostic async file job     │
│  slots, 202/jobId, Redis, JobMeta, SSE, queue, lock policy   │
└──────────────────────────────┬──────────────────────────────┘
                               │ invokes registered domain runner
┌──────────────────────────────▼──────────────────────────────┐
│  Domain layer (per importKind)                               │
│  orchestrate slots, business rules, persist                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ per uploadSlotId
┌──────────────────────────────▼──────────────────────────────┐
│  Format plugins layer                                        │
│  tabular-xlsx · jsonl · … under import/plugins/{id}/         │
└─────────────────────────────────────────────────────────────┘
```

| Area | Owns | Must not own |
| ---- | ---- | ------------ |
| **Transport** | `ImportUpload`, upload slots, `jobId`, **job phase**, opaque **progress**, **outcome**, error blob storage, **SSE**, lock policy | Worksheets, row numbers, XLSX headers, DB models, progress shape |
| **Format plugins** | Workbook/line parse, `ErrorDetail` emission, format progress shapes, error XLSX build (tabular-xlsx) | BullMQ, Redis, `importKind`, business rules |
| **Domain** | Per-`importKind` orchestration, row transforms, save strategy, domain runner | Queue wiring, multipart parsing, generic job TTL |

**Dependency rule:** Transport layer invokes domain layer (registered runner only). Domain layer may call format plugins layer per `uploadSlotId`. Format plugins must not call domain or transport. Transport layer must not import format plugins or ExcelJS.

**Plugin skills:** [import-plugin-tabular-xlsx](../import-plugin-tabular-xlsx/SKILL.md) · [import-plugin-jsonl](../import-plugin-jsonl/SKILL.md)

---

## When to use this skill

- Adding a new async import (`importKind`).
- Transport, SSE, registry, lock policy, domain runner wiring.
- Choosing what lives in domain vs format plugins (business rules vs parse).

---

## Transport layer

### What is a slot?

An **upload slot** is a **named multipart field** on the POST body. Its **`uploadSlotId`** is the field name (e.g. `mainWorkbook`) — a stable routing key for which role each file plays. **`originalName`** is display-only and is never used for routing. A single-file import declares one slot in `UploadSlotSpec[]`; multi-file `importKind` values add more slots (e.g. `supplement`).

### Progress is opaque in transport

Transport owns **job phase** (is the job still running?), not **progress** shape. Domain runners may put plugin-specific detail inside `JobMeta.progress`; transport stores and relays it without interpreting it.

Each `importKind` documents its progress schema on the client. Transport types `JobMeta.progress` as `unknown`.

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

1. Job store **`saveMeta`** writes Redis and **`publish`**es full `JobMeta` on `{prefix}:events:{jobId}`.
2. SSE sends current `JobMeta` on connect, then forwards pub/sub updates. Stream **closes** when `phase` is `complete` or `failed`.
3. Optional heartbeat events. Dedicated Redis subscriber per SSE client.

`GET jobs/:jobId/error-blob` when `outcome === "validation_failed"`.

### Worker

1. Load `Map<uploadSlotId, ImportUpload>`.
2. Resolve domain runner from registry by `importKind`.
3. Pass `onProgress(detail: unknown)` — patches `JobMeta.progress`, sets job phase to `processing` (pub/sub notifies SSE).
4. Map `DomainImportResult.outcome` to `JobMeta.outcome`; set job phase to `complete` (or `failed` on throw).
5. On outcome `validation_failed`, persist error blob (format plugin supplies XLSX bytes; transport stores bytes only).
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

## Format plugins layer

One plugin per **format family** under `import/plugins/{id}/`. Plugins are **`importKind`-agnostic**; the domain runner picks a plugin per **`uploadSlotId`**.

**Shared `ErrorDetail` contract** (all plugins emit this shape):

```typescript
type ErrorDetail = {
  rowNumber?: number;   // XLSX row or JSONL line (1-based)
  message: string;
  rawData: string;
  uploadSlotId?: string;
  originalName?: string;
  worksheetName?: string; // XLSX only; omit for JSONL
};
```

On `validation_failed`, domain merges `ErrorDetail[]` into one **XLSX** error blob (tabular-xlsx plugin builds; transport stores).

| Slot format | Plugin skill |
| ----------- | ------------ |
| `.xlsx` | [import-plugin-tabular-xlsx](../import-plugin-tabular-xlsx/SKILL.md) |
| `.jsonl` | [import-plugin-jsonl](../import-plugin-jsonl/SKILL.md) |

---

## Domain layer

One **domain runner** per `importKind`. Composes format plugins; implements business logic only.

### Interface (called by transport worker)

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

### Internal split

| Artifact | Role |
| -------- | ---- |
| **Sheet / line specs** | Worksheet names, header literals, required sheets, JSONL field rules |
| **Orchestrator** | Parse order per slot, fail-fast on missing sheets |
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

Multi-sheet: loop domain sheet specs; call `onProgress` with each `worksheetName`. Multi-slot: read each `uploads.get(...)` and call the matching format plugin.

### Outcomes

| Outcome | Valid rows in DB | Error blob |
| ------- | ---------------- | ---------- |
| `success` | all saved | none |
| `validation_failed` | partial save (default) | yes |
| `failed` (throw) | rollback if domain uses transaction | optional |

Default bulk import: **partial save + error XLSX**. Use a transaction in domain layer only when all-or-nothing is required.

**Do not** put Redis, BullMQ, or queue types in the domain layer. NestJS HTTP exceptions (e.g. `BadRequestException`) for missing slots are fine.

---

## Frontend

- **Transport layer:** `formData.append(uploadSlotId, file)` → POST → `EventSource` on `jobs/:jobId/events` (each event `data` is `JobMeta`); download error blob when `outcome === "validation_failed"`.
- **Per `importKind`:** type-narrow `JobMeta.progress` (e.g. `TabularImportProgress`, `JsonlImportProgress`).
- Export `uploadSlotId` constants beside the API client.

---

## Suggested module layout

```text
import/
  transport/              # transport layer
    async-import.types.ts
    import-registry.ts
    import-transport.service.ts
    import-job-store.ts
    import-job-progress-sse.service.ts
    import.processor.ts
  plugins/                # format plugins layer
    tabular-xlsx/
    jsonl/
applications/
  sales-import/           # domain layer example
    sales-import.domain-runner.ts
```

---

## Registration checklist

```text
Transport layer
- [ ] UploadSlotSpec[] in API docs (named fields, not files[])
- [ ] Domain runner registered by importKind
- [ ] Lock policy + stable reject code
- [ ] Single processor — no per-importKind Redis duplicate
- [ ] JobMeta.progress is unknown — no transport union for progress shape
- [ ] SSE jobs/:jobId/events + Redis pub/sub on saveMeta

Domain layer
- [ ] Sheet / line specs document literals and required shapes
- [ ] Missing required sheet throws before DB write
- [ ] Per-importKind notes: slots and row rules (not transport)
- [ ] Picks format plugin per uploadSlotId
```

Format plugin checklists live in plugin skills.

---

## What not to do

| Anti-pattern | Why |
| ------------ | --- |
| Transport layer imports ExcelJS | Couples transport to XLSX |
| Typed progress union in transport | Progress shape belongs in domain + client per `importKind` |
| Generic column-to-ORM mapper in format plugins | Belongs in domain layer or nowhere |
| Third copy of Redis service per `importKind` | Extend transport layer |
| Route uploads by filename | Use `uploadSlotId` |
| Confuse plugin id with `importKind` | Plugin = format; `importKind` = domain |

---

## Agent invocation

| Task | Skills |
| ---- | ------ |
| Transport, SSE, registry, new `importKind` | `async-import-runner` |
| XLSX parse / error XLSX | `import-plugin-tabular-xlsx` |
| JSONL parse | `import-plugin-jsonl` |
| End-to-end `sales-import` | all three |
