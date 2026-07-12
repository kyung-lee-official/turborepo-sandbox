# Appendix B: Shared Types

This appendix is the canonical TypeScript type reference for the async processing system. Layer chapters explain behavior; the `.ts` files in this folder define DTOs, enums, and progress payloads that cross layer boundaries.

Database enums and models for `ProcessingJob` align with [Appendix A: Prisma Data Model](../appendix-a-prisma-data-model/README.md).

## Type Files

| File                                                             | Contents                                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [`source-locator.types.ts`](./source-locator.types.ts)           | `SourceLocator`, `VerifiedSourceLocator`                                                          |
| [`upload.types.ts`](./upload.types.ts)                           | `UploadSession`, `UploadSessionSources`, S3 initiate/complete shapes                              |
| [`adapter.types.ts`](./adapter.types.ts)                         | `UploadSessionStore`, `StartProcessingInput`, `ProcessingSource`, start API DTOs                  |
| [`core.types.ts`](./core.types.ts)                               | Job phases, BullMQ payload, registry, `DomainRunner`, `DomainRunResult`, `ActiveJobConflictError` |
| [`import-shared.types.ts`](./import-shared.types.ts)             | `ErrorDetail`, NDJSON header, `DomainProcessingProgress`                                          |
| [`tabular-xlsx-plugin.types.ts`](./tabular-xlsx-plugin.types.ts) | `TabularSheetSpec`, `TabularProcessingProgress`, parsed row shape                                 |
| [`jsonl-plugin.types.ts`](./jsonl-plugin.types.ts)               | `JsonlProcessingProgress`, parse context                                                          |

These files are documentation references. Copy or adapt them into your application; they are not wired into the monorepo build.

## Type Flow

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

| Stage          | Type                                   | Produced by   | Consumed by                       |
| -------------- | -------------------------------------- | ------------- | --------------------------------- |
| Ingest         | `UploadSessionSources`                 | Upload layer  | `UploadSession`, auto-start event |
| Deferred start | `UploadSession`                        | Upload layer  | Adapter layer                     |
| Core boundary  | `StartProcessingInput`                 | Adapter layer | `ProcessingOrchestratorService`   |
| Persistence    | `sources` + `context` JSON on manifest | Core          | Worker                            |
| Worker         | `VerifiedProcessingSource`             | Core          | `DomainRunner`                    |
| Completion     | `DomainRunResult`                      | Domain        | Worker                            |

## Locator Fields

| Field                   | Set at                 | Notes                                              |
| ----------------------- | ---------------------- | -------------------------------------------------- |
| `path`, `bucket`, `key` | Upload ingest          | Server-generated only                              |
| `declaredSizeBytes`     | Upload ingest          | From multipart metadata or client complete payload |
| `sizeBytes`, `etag`     | Worker `verifyLocator` | Authoritative for domain run                       |

COS direct upload uses the same `SourceLocator` object shape with `provider: "cos"` and STS credentials on initiate instead of presigned PUT URLs.

## Upload to Processing Field Mapping

| Upload field                     | Processing field               |
| -------------------------------- | ------------------------------ |
| `UploadSourceEntry.sourceId`     | `ProcessingSource.sourceId`    |
| `UploadSourceEntry.originalName` | `ProcessingSource.label`       |
| `UploadSourceEntry.mimeType`     | `ProcessingSource.mimeType`    |
| `UploadSourceEntry.locator`      | `ProcessingSource.locator`     |
| `UploadSession.context`          | `StartProcessingInput.context` |

Map key in `UploadSessionSources` must equal `entry.sourceId`.

## Outcome Mapping

| `DomainRunResult.outcome` | DB `phase` | DB `outcome`        |
| ------------------------- | ---------- | ------------------- |
| `success`                 | `complete` | `success`           |
| `validation_failed`       | `complete` | `validation_failed` |
| Uncaught throw            | `failed`   | `failed`            |

`ProcessingPhase` and `ProcessingOutcome` mirror Prisma enums in Appendix A.

## Error Handling Notes

- Worker persists `ErrorDetail` rows on `validation_failed`. Domain returns `errors` in memory; core does not accept error blobs from the domain.
- `GET /app/async-processing/jobs/:jobId/errors` returns `application/x-ndjson`: line 1 is `ProcessingJobErrorsHeader`, lines 2..N are one `ErrorDetail` per line.
- Adapter layer maps `ActiveJobConflictError` to HTTP `409`. Auto-start event path logs and skips by default.

## Progress Notes

Clients discriminate live progress by `progress.phase` (plugin phases and domain phases).

| `phase`            | Emitter             | Layer  |
| ------------------ | ------------------- | ------ |
| `parsing_workbook` | Tabular XLSX plugin | Plugin |
| `parsing_lines`    | JSONL plugin        | Plugin |
| `loading_source`   | Domain runner       | Domain |
| `validating_rows`  | Domain runner       | Domain |
| `saving_database`  | Domain runner       | Domain |

Use immediate progress for `loading_source`. Throttle `validating_rows` and `saving_database` to about one second between emissions unless the job finishes.

For JSONL, `ErrorDetail.rowNumber` is the 1-based physical line number. Omit `worksheetName`.

BullMQ carries an `AsyncProcessingJobPayload` with references only. Load `sources` and `context` from manifest by `manifestId`.

## What Belongs Outside This Appendix

| Concern                                          | Document                                                |
| ------------------------------------------------ | ------------------------------------------------------- |
| Prisma models and DB enums                       | [Appendix A](../appendix-a-prisma-data-model/README.md) |
| Zod schemas for start API and events             | Layer 2 (future appendix)                               |
| Default TTLs, queue name, Redis channel prefixes | Future constants appendix                               |
| Repository and worker implementation patterns    | Layer 3                                                 |

## See Also

- [Layer 1: Optional Upload Layer](../01-optional-upload-layer/README.md)
- [Layer 2: Start Processing Adapter Layer](../02-start-processing-adapter-layer/README.md)
- [Layer 3: Async Processing Core Layer](../03-async-processing-core-layer/README.md)
- [Layer 4: Domain Business Layer](../04-domain-business-layer/README.md)
- [Support Layer: Import Plugins](../05-import-plugin-support-layer/README.md)
