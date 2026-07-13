# Appendix D: Validation Schemas

This appendix collects Zod schemas for HTTP bodies, query params, in-process events, and domain context. Schemas are grouped by the same layers as the main book.

Types live in [Appendix B: Shared Types](../appendix-b-shared-types/README.md). Constants live in [Appendix C: Constants and Redis Keys](../appendix-c-constants/README.md).

These files are documentation references. Copy or adapt them into your application; they are not wired into the monorepo build.

## Folder Layout

```text
appendix-d-validation-schemas/
  shared/
  01-optional-upload-layer/
  02-start-processing-adapter-layer/
  03-async-processing-core-layer/
  04-domain-business-layer/
```

---

## Who Validates What

| Layer | Validates with Zod | Validates in code (not Zod) |
| --- | --- | --- |
| Upload | Object-store initiate/complete JSON bodies | Multipart files, MIME allowlists, `sourceSpecs` |
| Adapters | `POST .../start` body, auto-start event payload | Map key equals `entry.sourceId` after parse |
| Core | `GET .../jobs` query params | Required `sourceSpecs` in orchestrator |
| Domain | `io.context` per domain schema | Business rules on parsed rows/lines |

Adapters must **not** duplicate orchestrator `sourceSpecs` checks. Upload ingest must **not** call `startProcessing`.

---

## Shared (cross-layer)

[`shared/source-locator.schema.ts`](./shared/source-locator.schema.ts)

| Schema | Role |
| --- | --- |
| `sourceLocatorSchema` | Discriminated union: `local` path or `object` bucket/key |

Used by adapter event payload and object-store session building.

---

## Layer 1: Optional Upload Layer

[`01-optional-upload-layer/object-store-upload.schema.ts`](./01-optional-upload-layer/object-store-upload.schema.ts)

| Schema | HTTP route | Role |
| --- | --- | --- |
| `objectStoreUploadInitiateBodySchema` | `POST /app/:domainKind/upload/s3/initiate` (or `/cos/initiate`) | Client file metadata before presigned upload |
| `objectStoreUploadCompleteBodySchema` | `POST /app/:domainKind/upload/s3/complete` (or `/cos/complete`) | Confirm uploaded files and optional sizes |

Multipart local upload does not use a JSON body schema. File field names are `sourceId` values; non-file form fields become `context` (see [Appendix C](../appendix-c-constants/README.md) reserved keys).

After Zod parse, the server still validates each `sourceId` against `DomainKindRegistration.sourceSpecs` and MIME allowlists.

Chapter: [Layer 1](../01-optional-upload-layer/README.md)

---

## Layer 2: Start Processing Adapter Layer

[`02-start-processing-adapter-layer/start-processing-input.schema.ts`](./02-start-processing-adapter-layer/start-processing-input.schema.ts)

| Schema | Used by | Role |
| --- | --- | --- |
| `startApiBodySchema` | API adapter | `.strict()` — only `uploadSessionId` and optional `domainKind` |
| `processingStartRequestedSchema` | Event adapter | Trusted in-process payload after upload ingest |
| `uploadSourceEntrySchema` | Event schema helper | One source entry with `locator` |

### Deferred start trust model

`startApiBodySchema` must reject bodies that include client `sources` or `context`. The API adapter loads canonical values from `UploadSessionStore`.

### After Zod parse (adapter code, not schema)

- Session exists and `expiresAt` is in the future.
- Optional: if body includes `domainKind`, it matches session `domainKind`.
- When mapping session to `StartProcessingInput`, each map key must equal `entry.sourceId`.

Chapter: [Layer 2](../02-start-processing-adapter-layer/README.md)

---

## Layer 3: Async Processing Core Layer

[`03-async-processing-core-layer/list-processing-jobs.schema.ts`](./03-async-processing-core-layer/list-processing-jobs.schema.ts)

| Schema | HTTP route | Role |
| --- | --- | --- |
| `listProcessingJobsQuerySchema` | `GET /app/async-processing/jobs` | `phase` (comma-separated), `domainKind`, `limit`, `cursor` |

### Orchestrator source validation (not Zod)

`ProcessingOrchestratorService.startProcessing` validates `StartProcessingInput.sources` against `DomainKindRegistration.sourceSpecs`:

- Every `required: true` spec must have a matching `sources[sourceId]`.
- Each entry's `sourceId` must match its map key.

`GET /app/async-processing/jobs/:jobId` and SSE have no request body schema. Job errors download returns NDJSON built from persisted rows.

Chapter: [Layer 3](../03-async-processing-core-layer/README.md)

---

## Layer 4: Domain Business Layer

[`04-domain-business-layer/domain-context.schema.example.ts`](./04-domain-business-layer/domain-context.schema.example.ts)

| Schema | Role |
| --- | --- |
| `invoiceImportContextSchema` | Example — replace per `domainKind` |

`ProcessingManifest.context` is optional JSON copied from upload or start adapters. Domain runners should `parse` `io.context` with a domain-owned schema at the start of `run`.

Business validation on parsed rows or lines stays in domain logic, not Zod request schemas.

Chapter: [Layer 4](../04-domain-business-layer/README.md)

---

## Support Layer

Format plugins do not define HTTP Zod schemas. Parse-time errors use `ErrorDetail` from [Appendix B](../appendix-b-shared-types/README.md).

---

## What Belongs Outside This Appendix

| Concern | Document |
| --- | --- |
| DTO types | [Appendix B](../appendix-b-shared-types/README.md) |
| TTLs and Redis keys | [Appendix C](../appendix-c-constants/README.md) |
| Prisma models | [Appendix A](../appendix-a-prisma-data-model/README.md) |
| Adapter and worker implementation patterns | Layer 2 and Layer 3 |

## See Also

- [Layer 1](../01-optional-upload-layer/README.md)
- [Layer 2](../02-start-processing-adapter-layer/README.md)
- [Layer 3](../03-async-processing-core-layer/README.md)
- [Layer 4](../04-domain-business-layer/README.md)
