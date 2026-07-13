# Appendix B: Shared Types

This appendix is the canonical TypeScript type reference for the async processing system. Types are grouped by the same layers as the main book. Layer chapters explain behavior; the `.ts` files in each folder define that layer's DTOs and payloads.

Database enums and models for `ProcessingJob` align with [Appendix A: Prisma Data Model](../appendix-a-prisma-data-model/README.md). Zod validation schemas live in [Appendix D: Validation Schemas](../appendix-d-validation-schemas/README.md).

These files are documentation references. Copy or adapt them into your application; they are not wired into the monorepo build.

## Folder Layout

```text
appendix-b-shared-types/
  shared/                          # cross-layer primitives
  01-optional-upload-layer/
  02-start-processing-adapter-layer/
  03-async-processing-core-layer/
  04-domain-business-layer/
  05-import-plugin-support-layer/
```

---

## Shared (cross-layer)

[`shared/source-locator.types.ts`](./shared/source-locator.types.ts)

| Type            | Used by                                                           |
| --------------- | ----------------------------------------------------------------- |
| `SourceLocator` | Upload ingest, adapters, manifest JSON, worker verification input |

Worker output adds `sizeBytes` and optional `etag` as `VerifiedSourceLocator` in Layer 3.

Related chapter: locators appear in [Layer 1](../01-optional-upload-layer/README.md) and [Layer 3](../03-async-processing-core-layer/README.md).

### Locator fields

| Field                   | Set at                 | Notes                                              |
| ----------------------- | ---------------------- | -------------------------------------------------- |
| `path`, `bucket`, `key` | Upload ingest          | Server-generated only                              |
| `declaredSizeBytes`     | Upload ingest          | From multipart metadata or client complete payload |
| `sizeBytes`, `etag`     | Worker `verifyLocator` | Authoritative for domain run                       |

COS direct upload uses `provider: "cos"` with STS credentials on initiate instead of presigned PUT URLs.

---

## Layer 1: Optional Upload Layer

[`01-optional-upload-layer/upload.types.ts`](./01-optional-upload-layer/upload.types.ts)

| Type                   | Role                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| `LocalUploadSession`   | Multipart form fields (`domainKind`, `autoStart`, optional `context`) |
| `UploadSourceEntry`    | One server-built source with `originalName` and `locator`             |
| `UploadSessionSources` | Map of `sourceId` to `UploadSourceEntry`                              |
| `UploadSession`        | Persisted session for deferred start                                  |
| `DeferredUploadResult` | Upload API success body (`uploadSessionId` only)                      |
| `S3InitiateResult`     | Presigned PUT targets per `sourceId`                                  |
| `S3CompleteBody`       | Client complete payload with optional `declaredSizeBytes`             |

Chapter: [Layer 1: Optional Upload Layer](../01-optional-upload-layer/README.md)

---

## Layer 2: Start Processing Adapter Layer

[`02-start-processing-adapter-layer/adapter.types.ts`](./02-start-processing-adapter-layer/adapter.types.ts)

| Type                              | Role                                                  |
| --------------------------------- | ----------------------------------------------------- |
| `UploadSessionStore`              | `save`, `get`, `consume` for deferred sessions        |
| `ProcessingStartRequestedPayload` | Auto-start event payload (in-process only)            |
| `StartProcessingInput`            | Canonical input to `startProcessing`                  |
| `ProcessingSource`                | One manifest source (`label` replaces `originalName`) |
| `StartApiBody`                    | `POST applications/async-processing/start` body               |
| `StartProcessingResult`           | `202` response (`jobId`, `manifestId`)                |

### Upload to processing field mapping

| Upload field                     | Processing field               |
| -------------------------------- | ------------------------------ |
| `UploadSourceEntry.sourceId`     | `ProcessingSource.sourceId`    |
| `UploadSourceEntry.originalName` | `ProcessingSource.label`       |
| `UploadSourceEntry.mimeType`     | `ProcessingSource.mimeType`    |
| `UploadSourceEntry.locator`      | `ProcessingSource.locator`     |
| `UploadSession.context`          | `StartProcessingInput.context` |

Map key in `UploadSessionSources` must equal `entry.sourceId`.

Chapter: [Layer 2: Start Processing Adapter Layer](../02-start-processing-adapter-layer/README.md)

---

## Layer 3: Async Processing Core Layer

[`03-async-processing-core-layer/core.types.ts`](./03-async-processing-core-layer/core.types.ts)

| Type                        | Role                                      |
| --------------------------- | ----------------------------------------- |
| `ProcessingPhase`           | Job lifecycle phase (mirrors Prisma enum) |
| `ProcessingOutcome`         | Terminal outcome (mirrors Prisma enum)    |
| `VerifiedSourceLocator`     | Locator after worker verification         |
| `VerifiedProcessingSource`  | Source passed to `DomainRunner`           |
| `AsyncProcessingJobPayload` | BullMQ job data (references only)         |
| `ProcessingProgressEvent`   | Redis pub/sub progress envelope           |
| `ProcessingTerminalEvent`   | Redis pub/sub terminal signal             |
| `SourceSpec`                | Required/optional `sourceId` in registry  |
| `ProcessingLockPolicy`      | `none` or `global_singleton`              |
| `DomainUploadPolicy`        | MIME allowlists for upload routes         |
| `DomainKindRegistration`    | Registry entry for one `domainKind`       |
| `ActiveJobConflictError`    | Thrown when singleton lock is busy        |

BullMQ carries `AsyncProcessingJobPayload` only. Load `sources` and `context` from manifest by `manifestId`.

Adapter layer maps `ActiveJobConflictError` to HTTP `409`. Auto-start event path logs and skips by default.

Chapter: [Layer 3: Async Processing Core Layer](../03-async-processing-core-layer/README.md)

---

## Layer 4: Domain Business Layer

[`04-domain-business-layer/domain-runner.types.ts`](./04-domain-business-layer/domain-runner.types.ts)

| Type              | Role                                                         |
| ----------------- | ------------------------------------------------------------ |
| `DomainRunnerIo`  | `openStream`, `onProgress`, optional `context` from manifest |
| `DomainRunResult` | `success` or `validation_failed` with counts and errors      |
| `DomainRunner`    | Business work entry point                                    |

[`04-domain-business-layer/domain-progress.types.ts`](./04-domain-business-layer/domain-progress.types.ts)

| Type                       | Role                                                   |
| -------------------------- | ------------------------------------------------------ |
| `DomainProcessingPhase`    | `loading_source`, `validating_rows`, `saving_database` |
| `DomainProcessingProgress` | Throttled or immediate progress payload                |

### Outcome mapping

| `DomainRunResult.outcome` | DB `phase` | DB `outcome`        |
| ------------------------- | ---------- | ------------------- |
| `success`                 | `complete` | `success`           |
| `validation_failed`       | `complete` | `validation_failed` |
| Uncaught throw            | `failed`   | `failed`            |

Use immediate progress for `loading_source`. Throttle `validating_rows` and `saving_database` to about one second between emissions unless the job finishes.

Chapter: [Layer 4: Domain Business Layer](../04-domain-business-layer/README.md)

---

## Support Layer: Import Plugins and Shared Utilities

[`05-import-plugin-support-layer/import-shared.types.ts`](./05-import-plugin-support-layer/import-shared.types.ts)

| Type                        | Role                                           |
| --------------------------- | ---------------------------------------------- |
| `ErrorDetail`               | Row/line validation error (domain and plugins) |
| `ProcessingJobErrorsHeader` | First line of NDJSON error download            |

[`05-import-plugin-support-layer/tabular-xlsx-plugin.types.ts`](./05-import-plugin-support-layer/tabular-xlsx-plugin.types.ts)

| Type                        | Role                                      |
| --------------------------- | ----------------------------------------- |
| `TabularSheetSpec`          | Domain-supplied sheet name and header row |
| `TabularProcessingProgress` | `parsing_workbook` progress               |
| `TabularParsedRow`          | Parsed row map for domain `onRow`         |

[`05-import-plugin-support-layer/jsonl-plugin.types.ts`](./05-import-plugin-support-layer/jsonl-plugin.types.ts)

| Type                      | Role                                              |
| ------------------------- | ------------------------------------------------- |
| `JsonlProcessingProgress` | `parsing_lines` progress                          |
| `JsonlParseContext`       | `sourceId` and optional label for parse callbacks |

### Error download

`GET jobs/:jobId/errors` returns `application/x-ndjson`: line 1 is `ProcessingJobErrorsHeader`, lines 2..N are one `ErrorDetail` per line.

Worker persists `ErrorDetail` rows on `validation_failed`. Domain returns `errors` in memory; core does not accept error blobs from the domain.

For JSONL, `ErrorDetail.rowNumber` is the 1-based physical line number. Omit `worksheetName`.

Implementation guides: [import-shared.md](../05-import-plugin-support-layer/import-shared.md), [xlsx.md](../05-import-plugin-support-layer/xlsx.md), [jsonl.md](../05-import-plugin-support-layer/jsonl.md). Hub: [Support Layer](../05-import-plugin-support-layer/README.md).

---

## Type Flow (all layers)

```mermaid
---
config:
  theme: neo-dark
---
flowchart LR
  upload["UploadSessionSources"]
  session["UploadSession"]
  input["StartProcessingInput"]
  manifest["ProcessingManifest.sources + context"]
  verified["VerifiedProcessingSource"]
  result["DomainRunResult"]

  upload --> session
  session --> input
  input --> manifest
  manifest --> verified
  verified --> result
```

| Stage          | Type                           | Layer      |
| -------------- | ------------------------------ | ---------- |
| Ingest         | `UploadSessionSources`         | 1          |
| Deferred start | `UploadSession`                | 1          |
| Core boundary  | `StartProcessingInput`         | 2          |
| Persistence    | manifest `sources` + `context` | 3 (Prisma) |
| Worker         | `VerifiedProcessingSource`     | 3          |
| Completion     | `DomainRunResult`              | 4          |

## Progress Phases (plugins and domain)

| `phase`            | Emitter             | Layer   |
| ------------------ | ------------------- | ------- |
| `parsing_workbook` | Tabular XLSX plugin | Support |
| `parsing_lines`    | JSONL plugin        | Support |
| `loading_source`   | Domain runner       | 4       |
| `validating_rows`  | Domain runner       | 4       |
| `saving_database`  | Domain runner       | 4       |

Clients discriminate live progress by `progress.phase`.

---

## What Belongs Outside This Appendix

| Concern                                             | Document                                                  |
| --------------------------------------------------- | --------------------------------------------------------- |
| Prisma models and DB enums                          | [Appendix A](../appendix-a-prisma-data-model/README.md)   |
| Zod schemas for HTTP, events, and domain context    | [Appendix D](../appendix-d-validation-schemas/README.md)  |
| Default TTLs, queue name, Redis channel prefixes    | [Appendix C](../appendix-c-constants/README.md)           |
| Adapter implementation patterns (store, adapters)   | [Layer 2](../02-start-processing-adapter-layer/README.md) |
| Upload implementation patterns (multipart, S3, COS) | [Layer 1](../01-optional-upload-layer/README.md)          |
| Plugin implementation patterns (import-shared, XLSX, JSONL) | [Support Layer](../05-import-plugin-support-layer/README.md) |
| Repository and worker implementation patterns       | [Layer 3](../03-async-processing-core-layer/README.md)    |
