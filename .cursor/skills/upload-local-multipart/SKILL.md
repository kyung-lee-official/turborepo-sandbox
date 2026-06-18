---
name: upload-local-multipart
description: >-
  Local disk upload via NestJS multipart proxy ingest. Saves files to server path,
  verifies, registerReady ImportBatch. Nest-side upload progress optional. Use when
  implementing dev/small-file upload before async processing.
---

# Upload — local multipart (proxy ingest)

## Goal

Client sends files to **NestJS** via multipart. Server writes to **local disk**, verifies, then **`registerReady`** on [import-batch-contract](../import-batch-contract/SKILL.md). Upload lifecycle ends at `{ batchId }`; processing starts separately via [async-processing](../async-processing/SKILL.md).

**Upload progress:** reported from Nest (stream meter, optional SSE) — not from job SSE.

---

## Flow

```text
POST /upload/local/sessions                    → { batchId, slots: UploadSlotSpec[] }
POST /upload/local/sessions/:id/slots/:slotId  multipart "file"  → slot saved
POST /upload/local/sessions/:id/complete       → registerReady → { batchId, status: "ready" }

POST /applications/async-import/batches/:batchId/start { importKind }  → { jobId }
```

Convenience: a single multipart POST that saves all slots and calls `registerReady` is fine for small imports if documented.

---

## Responsibilities

| Concern | This path |
| ------- | --------- |
| Multipart validation per `UploadSlotSpec` | yes |
| Server-generated path (`uploads/{batchId}/{slotId}/...`) | yes |
| Verify file on disk (size, exists) before `ready` | yes |
| `registerReady(ImportBatch)` with `source: { kind: "local", path, sizeBytes }` | yes |
| Upload progress UX | yes (Nest) |
| Enqueue BullMQ / JobMeta | **no** |

---

## ImportBatchSource

```typescript
source: {
  kind: "local";
  path: string;       // absolute or rooted under app upload dir
  sizeBytes: number;
}
```

Never accept `path` from the client.

---

## Suggested files

```text
upload/local-multipart/
  local-upload.controller.ts
  local-upload.service.ts
```

Depends on `import/contract/import-batch.registry.ts` only — not on `import/processing/`.

---

## Checklist

```text
- [ ] Trim/normalize at ingest if needed; persist verified sizeBytes
- [ ] TTL or sweeper for orphan files under upload dir
- [ ] Return batchId; client calls startProcessing separately
- [ ] Document uploadSlotId constants beside API client
```
