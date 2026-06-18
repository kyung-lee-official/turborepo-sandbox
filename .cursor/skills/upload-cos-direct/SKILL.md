---
name: upload-cos-direct
description: >-
  Tencent COS direct upload via STS temporary credentials. Backend issues grant;
  client uses cos-js-sdk-v5 with onProgress; complete verifies and registerReady
  ImportBatch. Use for COS-based direct ingest before async processing.
---

# Upload — Tencent COS direct (STS)

## Goal

Client uploads **directly to Tencent COS** using **short-lived STS credentials**. Backend issues grant + **server-generated key**; on **complete**, verify object metadata and **`registerReady`**. Contract: [import-batch-contract](../import-batch-contract/SKILL.md). Processing: [async-processing](../async-processing/SKILL.md).

**Upload progress:** COS SDK `onProgress` — not job SSE.

This path is **not** the same workflow as S3 presigned PUT; only the **ImportBatch** handoff is shared. See [upload-s3-direct](../upload-s3-direct/SKILL.md) for presigned-PUT pattern.

---

## Flow

```text
POST /upload/cos/sessions/:batchId/slots/:uploadSlotId/initiate
  { originalName, mimeType, sizeBytes }
  → { kind: "sts", bucket, region, objectKey, credentials, expiresAt }

cos.putObject({ ... })  (client; onProgress)

POST /upload/cos/sessions/:batchId/slots/:uploadSlotId/complete
  { objectKey }
  → registerReady when all slots done → { batchId }

POST .../batches/:batchId/start { importKind }  → { jobId }
```

Existing reference: `TencentCosObjectsService.getTemporaryCredential` in `apps/nest-app/src/tencent-cos-objects/`.

---

## Responsibilities

| Concern | This path |
| ------- | --------- |
| STS policy scoped to prefix + PutObject | yes |
| Server-generated `objectKey` | yes |
| HEAD/metadata verify on complete | yes |
| `registerReady` with `provider: "cos"` | yes |
| Presigned PUT URL (S3 style) | **no** — use STS grant instead |

---

## DirectUploadGrant (this path)

```typescript
type CosStsGrant = {
  kind: "sts";
  uploadSlotId: string;
  objectKey: string;
  bucket: string;
  region: string;
  credentials: {
    tmpSecretId: string;
    tmpSecretKey: string;
    sessionToken: string;
  };
  expiresAt: string;
};
```

---

## ImportBatchSource

```typescript
source: {
  kind: "object";
  provider: "cos";
  bucket: string;
  key: string;
  sizeBytes: number;
  etag?: string;
}
```

---

## Suggested files

```text
upload/cos-direct/
  cos-upload.controller.ts
  cos-sts.service.ts
```

---

## Checklist

```text
- [ ] STS duration aligned with expected upload time (e.g. 5–15 min)
- [ ] allowPrefix restricted to app upload prefix
- [ ] HEAD verify before registerReady
- [ ] Do not proxy file through Nest
```
