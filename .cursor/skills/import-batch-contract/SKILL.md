---
name: import-batch-contract
description: >-
  Import inbound contract: ImportBatch, ImportBatchRegistry, ImportBatchSlotReader.
  Handoff from any upload path to async processing. Use when wiring upload complete
  to startProcessing, defining batch types, or adding a new upload mechanism.
---

# Import batch — inbound contract

## Goal

**Upload paths are independent** (local multipart, S3 presigned, COS STS, …). **Async processing is upload-agnostic.** The only shared surface is this **inbound contract**: a verified `ImportBatch` plus an explicit trigger into processing.

Upload progress lives on the upload path. Job progress lives on async processing (SSE). Do not mix them in the contract.

**Related skills:** [async-processing](../async-processing/SKILL.md) · [upload-local-multipart](../upload-local-multipart/SKILL.md) · [upload-s3-direct](../upload-s3-direct/SKILL.md) · [upload-cos-direct](../upload-cos-direct/SKILL.md)

---

## Architecture

```text
[Upload path A]  ──registerReady──┐
[Upload path B]  ──registerReady──┼──► ImportBatch (status: ready)
[Upload path C]  ──registerReady──┘              │
                                                 │ startProcessing(batchId, importKind)
                                                 ▼
                                    Async processing (job, queue, SSE, worker)
                                                 │
                                                 ▼
                                    Domain runner + format plugins
```

| Piece | Role |
| ----- | ---- |
| **ImportBatch** | Inbound contract — slots + resolved sources (no buffers in contract) |
| **ImportBatchRegistry** | Handoff store: `registerReady`, `claimByJobId`, `getByBatchId` |
| **ImportBatchSlotReader** | Open/delete blobs by `ImportBatchSource` (worker uses this) |
| **Upload paths** | Each ends with `registerReady`; never enqueue jobs |
| **Async processing** | `startProcessing` only; never accepts multipart or presigned grants |

---

## Terminology

| Term | Meaning |
| ---- | ------- |
| **batchId** | Stable id for one handoff unit; returned when upload path finishes |
| **uploadSlotId** | Routing key for a file's role (e.g. `mainWorkbook`); same across upload, contract, domain |
| **originalName** | Client filename; display only, never used for routing |
| **ImportBatchSource** | Where bytes live after upload — local path or object key |
| **ready** | All required slots verified; safe to call `startProcessing` |
| **claimed** | Processing took ownership; `claimedByJobId` set |

---

## Types

```typescript
type ImportBatchStatus = "ready" | "claimed" | "expired";

type ImportBatch = {
  batchId: string;
  status: ImportBatchStatus;
  slots: Record<string, ImportBatchSlot>;
  createdAt: string;
  expiresAt: string;
  claimedByJobId?: string;
};

type ImportBatchSlot = {
  uploadSlotId: string;
  originalName: string;
  mimeType?: string;
  source: ImportBatchSource;
};

type ImportBatchSource =
  | {
      kind: "local";
      path: string;       // server-generated; never client-supplied
      sizeBytes: number;
    }
  | {
      kind: "object";
      provider: "s3" | "cos";
      bucket: string;
      key: string;        // server-generated
      sizeBytes: number;
      etag?: string;
    };
```

**Rules**

- Processing never sees `Buffer`, presigned URLs, STS credentials, or multipart.
- Routing uses **`uploadSlotId`**, never **`originalName`**.
- Status **`ready`** only after verify: file on disk, or `HEAD` on object (size, optional etag).
- **`importKind`** is not on the batch; it is supplied at **`startProcessing`** so one batch is “these files exist” and routing stays in the processing registry.

### Slot spec (shared with processing registry)

```typescript
type UploadSlotSpec = { uploadSlotId: string; required: boolean };
```

Upload paths validate against the slot list their UI documents. Processing re-validates against `ImportKindRegistration.uploadSlots` at `startProcessing`.

---

## ImportBatchRegistry

Metadata only (Redis or DB). **Never store file bytes here.**

```typescript
interface ImportBatchRegistry {
  registerReady(batch: ImportBatch): Promise<void>;
  getByBatchId(batchId: string): Promise<ImportBatch | null>;
  /**
   * Atomically ready → claimed, set claimedByJobId.
   * Returns false if missing, not ready, expired, or already claimed.
   */
  claimByJobId(batchId: string, jobId: string): Promise<boolean>;
  markExpired(batchId: string): Promise<void>;
}
```

| Method | Caller |
| ------ | ------ |
| `registerReady` | Any upload path when ingest is verified |
| `getByBatchId` | `startProcessing`, worker |
| `claimByJobId` | `startProcessing` before enqueue |
| `markExpired` | TTL sweeper |

**TTL:** set `expiresAt` (e.g. 24h). Unclaimed batches expire; delete orphan blobs via reader + object lifecycle rules.

---

## ImportBatchSlotReader

Used by the **processing worker** only. Upload paths do not need it.

```typescript
interface ImportBatchSlotReader {
  openReadStream(source: ImportBatchSource): Promise<Readable>;
  deleteSource(source: ImportBatchSource): Promise<void>;
}
```

| `source.kind` | `openReadStream` | `deleteSource` |
| ------------- | ---------------- | -------------- |
| `local` | `fs.createReadStream(path)` | unlink |
| `object` | S3/COS `GetObject` | `DeleteObject` |

Domain and format plugins receive streams or buffers materialized at the domain boundary — not upload implementation details.

---

## Upload path obligation

Each upload mechanism owns its **full client workflow** (including upload progress). Its **only** coupling to processing:

1. Build `ImportBatch` with verified slots.
2. Call `registerReady(batch)`.
3. Return `{ batchId }` to the client.

Example (local path after multipart save):

```typescript
await importBatchRegistry.registerReady({
  batchId,
  status: "ready",
  slots: {
    mainWorkbook: {
      uploadSlotId: "mainWorkbook",
      originalName: file.originalname,
      mimeType: file.mimetype,
      source: { kind: "local", path: savedPath, sizeBytes },
    },
  },
  createdAt,
  expiresAt,
});
return { batchId };
```

Object-store paths differ in how they fill `source: { kind: "object", ... }` before the same `registerReady` call. See upload skills.

---

## Processing trigger (consumer of contract)

Async processing exposes **`startProcessing(importKind, batchId)`**:

1. Load batch; reject if not `ready` or expired.
2. Validate slots against registry `UploadSlotSpec[]` for `importKind`.
3. Lock policy.
4. Create `jobId`, `JobMeta` (`phase: queued`).
5. `claimByJobId(batchId, jobId)` — reject if false.
6. Enqueue `{ jobId, importKind, batchId }`.
7. Return **202** `{ jobId }`.

Client sequence:

```text
1. Finish upload path        → { batchId }
2. POST .../batches/:batchId/start { importKind }  → { jobId }
3. SSE .../jobs/:jobId/events                      → JobMeta
```

---

## Invariants

1. **Ready means verified** — no `ready` without `sizeBytes` (and etag when object store provides it).
2. **One claim per batch** — second `startProcessing` gets a stable error (e.g. 409).
3. **Claim before enqueue** — avoids duplicate workers on retry.
4. **Server owns keys/paths** — clients send `originalName` for display only.
5. **Cleanup after terminal job** — worker calls `deleteSource` per slot; drop or archive batch record.
6. **No upload progress in ImportBatch** — contract is post-upload only.

---

## Suggested module layout

```text
import/
  contract/
    import-batch.types.ts
    import-batch.registry.ts
    import-batch-slot.reader.ts
  processing/                 # see async-processing skill
    ...
upload/                       # independent entry points — not one unified layer
  local-multipart/
  s3-direct/
  cos-direct/
```

---

## Checklist (new upload path)

```text
- [ ] Own HTTP flow and upload progress UX
- [ ] Server-generated path or object key per slot
- [ ] Verify before registerReady (disk flush or object HEAD)
- [ ] registerReady with status "ready" only when all required slots done
- [ ] Return batchId; do not enqueue BullMQ
- [ ] Document uploadSlotId constants for the client
```

---

## Agent invocation

| Task | Skills |
| ---- | ------ |
| Inbound types, registry, reader | `import-batch-contract` |
| startProcessing, worker, SSE | `async-processing` |
| Local proxy upload | `upload-local-multipart` |
| S3 presigned direct upload | `upload-s3-direct` |
| Tencent COS STS direct upload | `upload-cos-direct` |
| Domain + format plugins | `async-processing` + plugin skills |
