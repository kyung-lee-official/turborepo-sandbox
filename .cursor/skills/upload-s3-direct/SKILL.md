---
name: upload-s3-direct
description: >-
  S3 direct upload via presigned PUT. Backend issues URL and object key; client
  uploads with native progress; complete verifies HEAD and registerReady ImportBatch.
  Use when implementing production object-store ingest for async imports.
---

# Upload — S3 direct (presigned PUT)

## Goal

Client uploads **directly to S3**. Backend issues a **presigned PUT**, verifies on **complete**, then **`registerReady`**. See [import-batch-contract](../import-batch-contract/SKILL.md). Processing via [async-processing](../async-processing/SKILL.md).

**Upload progress:** S3 client / `fetch` / `xhr.upload` — not job SSE.

---

## Flow

```text
POST /upload/s3/sessions/:batchId/slots/:uploadSlotId/initiate
  { originalName, mimeType, sizeBytes }
  → { kind: "presigned_put", url, headers, objectKey, expiresAt }

PUT <presigned url>  (client; progress from client)

POST /upload/s3/sessions/:batchId/slots/:uploadSlotId/complete
  { objectKey }
  → slot committed; when all required slots done → registerReady → { batchId }

POST .../batches/:batchId/start { importKind }  → { jobId }
```

---

## Responsibilities

| Concern | This path |
| ------- | --------- |
| Server-generated `objectKey` | yes |
| Presigned PUT scoped to one key, short TTL | yes |
| `HEAD` verify size (and etag) on complete | yes |
| `registerReady` with `source: { kind: "object", provider: "s3", ... }` | yes |
| Client upload progress | yes (browser) |
| Proxy file bytes through Nest | **no** |
| Enqueue jobs | **no** |

---

## DirectUploadGrant (this path)

```typescript
type S3PresignedGrant = {
  kind: "presigned_put";
  uploadSlotId: string;
  objectKey: string;
  url: string;
  headers: Record<string, string>;
  expiresAt: string;
};
```

MinIO and other S3-compatible stores use the same pattern.

---

## ImportBatchSource

```typescript
source: {
  kind: "object";
  provider: "s3";
  bucket: string;
  key: string;
  sizeBytes: number;
  etag?: string;
}
```

Worker reads via `ImportBatchSlotReader` (`GetObject`).

---

## Suggested files

```text
upload/s3-direct/
  s3-upload.controller.ts
  s3-presigned.service.ts
```

---

## Checklist

```text
- [ ] Server generates objectKey; client never picks final key
- [ ] Do not mark ready without HEAD verify
- [ ] CORS on bucket for browser PUT if needed
- [ ] Lifecycle rule for orphan prefixes under uploads/
```
