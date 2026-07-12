# Appendix B: Shared Types

This appendix is the canonical TypeScript type reference for the async processing system. Layer chapters explain behavior; this document collects DTOs, enums, and progress payloads that cross layer boundaries.

Database enums and models for `ProcessingJob` align with [Appendix A: Prisma Data Model](../appendix-a-prisma-data-model/README.md).

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

---

## Locators

Shared by upload, adapters, manifest, and worker verification.

```typescript
type SourceLocator =
  | { kind: "local"; path: string; declaredSizeBytes?: number }
  | {
      kind: "object";
      provider: "s3" | "cos";
      bucket: string;
      key: string;
      declaredSizeBytes?: number;
    };

type VerifiedSourceLocator = SourceLocator & {
  sizeBytes: number;
  etag?: string;
};
```

| Field                   | Set at                 | Notes                                              |
| ----------------------- | ---------------------- | -------------------------------------------------- |
| `path`, `bucket`, `key` | Upload ingest          | Server-generated only                              |
| `declaredSizeBytes`     | Upload ingest          | From multipart metadata or client complete payload |
| `sizeBytes`, `etag`     | Worker `verifyLocator` | Authoritative for domain run                       |

---

## Upload Layer

### Multipart form session

```typescript
type LocalUploadSession = {
  domainKind: string;
  autoStart?: boolean; // default false
  uploadSessionId?: string; // optional client hint; server may generate nanoid()
  context?: Record<string, unknown>;
};
```

### Session sources and session record

```typescript
type UploadSourceEntry = {
  sourceId: string;
  originalName: string;
  mimeType?: string;
  locator: SourceLocator;
};

type UploadSessionSources = Record<string, UploadSourceEntry>;

type UploadSession = {
  uploadSessionId: string;
  domainKind: string;
  sources: UploadSessionSources;
  expiresAt: Date;
  /** Optional idempotent replay after first successful start */
  startedJobId?: string;
  startedManifestId?: string;
  context?: Record<string, unknown>;
};
```

### Upload API responses

```typescript
type DeferredUploadResult = {
  uploadSessionId: string;
};

type S3InitiateResult = {
  uploadSessionId: string;
  uploads: Record<
    string,
    {
      sourceId: string;
      bucket: string;
      key: string;
      presignedPutUrl: string;
      requiredHeaders?: { "Content-Type"?: string };
    }
  >;
};

type S3CompleteBody = {
  uploadSessionId: string;
  files: Array<{
    sourceId: string;
    declaredSizeBytes?: number;
  }>;
};
```

COS direct upload uses the same locator shape with `provider: "cos"` and STS credentials on initiate instead of presigned PUT URLs.

---

## Adapter Layer

### Session store

```typescript
interface UploadSessionStore {
  save(session: UploadSession): Promise<void>;
  get(uploadSessionId: string): Promise<UploadSession | null>;
  /** Delete session after successful start (default policy) */
  consume(uploadSessionId: string): Promise<void>;
}
```

### Auto-start event payload

In-process only. Upload ingest emits; event adapter validates and calls `startProcessing`.

```typescript
type ProcessingStartRequestedPayload = {
  domainKind: string;
  sources: UploadSessionSources;
  context?: Record<string, unknown>;
};
```

### Core boundary DTO

```typescript
type StartProcessingInput = {
  domainKind: string;
  sources: Record<string, ProcessingSource>;
  context?: Record<string, unknown>;
};

type ProcessingSource = {
  sourceId: string;
  label?: string;
  mimeType?: string;
  locator: SourceLocator;
};
```

### Start API

```typescript
type StartApiBody = {
  uploadSessionId: string;
  domainKind?: string; // optional verification
};

type StartProcessingResult = {
  jobId: string;
  manifestId: string;
};
```

### Field mapping (upload to processing)

| Upload field                     | Processing field               |
| -------------------------------- | ------------------------------ |
| `UploadSourceEntry.sourceId`     | `ProcessingSource.sourceId`    |
| `UploadSourceEntry.originalName` | `ProcessingSource.label`       |
| `UploadSourceEntry.mimeType`     | `ProcessingSource.mimeType`    |
| `UploadSourceEntry.locator`      | `ProcessingSource.locator`     |
| `UploadSession.context`          | `StartProcessingInput.context` |

Map key in `UploadSessionSources` must equal `entry.sourceId`.

---

## Core Processing

### Job phase and outcome

Mirror Prisma enums in [Appendix A](../appendix-a-prisma-data-model/README.md).

```typescript
type ProcessingPhase = "queued" | "processing" | "complete" | "failed";

type ProcessingOutcome = "success" | "validation_failed" | "failed";
```

### Verified sources

```typescript
type VerifiedProcessingSource = ProcessingSource & {
  verifiedLocator: VerifiedSourceLocator;
};
```

### BullMQ payload

References only. Load `sources` and `context` from manifest by `manifestId`.

```typescript
type AsyncProcessingJobPayload = {
  jobId: string;
  domainKind: string;
  manifestId: string;
};
```

### Redis pub/sub events

```typescript
type ProcessingProgressEvent = {
  jobId: string;
  progress: unknown;
};

type ProcessingTerminalEvent = {
  jobId: string;
  phase: "complete" | "failed";
};
```

Clients discriminate live progress by `progress.phase` (plugin phases, domain phases).

### Domain registry

```typescript
type SourceSpec = {
  sourceId: string;
  required: boolean;
};

type ProcessingLockPolicy = { type: "none" } | { type: "global_singleton" };

type DomainUploadPolicy = {
  allowedMimeBySourceId?: Record<string, readonly string[]>;
  defaultAllowedMimeTypes?: readonly string[];
};

type DomainRunnerIo = {
  openStream: (source: VerifiedProcessingSource) => Promise<Readable>;
  onProgress: (detail: unknown) => Promise<void>;
  context?: Record<string, unknown>;
};

type DomainRunner = {
  domainKind: string;
  run(
    jobId: string,
    sources: Map<string, VerifiedProcessingSource>,
    io: DomainRunnerIo,
  ): Promise<DomainRunResult>;
};

type DomainKindRegistration = {
  domainRunner: DomainRunner;
  sourceSpecs: SourceSpec[];
  lockPolicy: ProcessingLockPolicy;
  upload?: DomainUploadPolicy;
};
```

### Domain result

```typescript
type DomainRunResult =
  | { outcome: "success"; processedCount: number; errorCount: 0 }
  | {
      outcome: "validation_failed";
      processedCount: number;
      errorCount: number;
      errors: readonly ErrorDetail[];
    };
```

| `DomainRunResult.outcome` | DB `phase` | DB `outcome`        |
| ------------------------- | ---------- | ------------------- |
| `success`                 | `complete` | `success`           |
| `validation_failed`       | `complete` | `validation_failed` |
| Uncaught throw            | `failed`   | `failed`            |

### Errors

```typescript
class ActiveJobConflictError extends Error {
  constructor(domainKind: string) {
    super(`A processing job is already active for domainKind ${domainKind}`);
    this.name = "ActiveJobConflictError";
  }
}
```

Adapter layer maps `ActiveJobConflictError` to HTTP `409`. Auto-start event path logs and skips by default.

---

## Import Shared

### Validation errors

```typescript
type ErrorDetail = {
  message: string;
  sourceId?: string;
  originalName?: string;
  worksheetName?: string; // tabular only
  rowNumber?: number;
  rawData?: string;
};
```

Worker persists `ErrorDetail` rows on `validation_failed`. Domain returns `errors` in memory; core does not accept error blobs from the domain.

### NDJSON error download shape

`GET /app/async-processing/jobs/:jobId/errors` returns `application/x-ndjson`:

```typescript
type ProcessingJobErrorsHeader = {
  kind: "header";
  jobId: string;
  domainKind: string;
  errorCount: number;
};

// Line 1: JSON.stringify(ProcessingJobErrorsHeader)
// Lines 2..N: one JSON.stringify(ErrorDetail) per line
```

### Domain progress

```typescript
type DomainProcessingPhase =
  | "loading_source"
  | "validating_rows"
  | "saving_database";

type DomainProcessingProgress = {
  phase: DomainProcessingPhase;
  sourceId: string;
  originalName?: string;
  worksheetName?: string;
  totalCount?: number;
  processedCount?: number;
  validCount?: number;
  errorCount?: number;
  percent?: number;
};
```

Use immediate progress for `loading_source`. Throttle `validating_rows` and `saving_database` to about one second between emissions unless the job finishes.

---

## Tabular XLSX Plugin

```typescript
type TabularPluginPhase = "parsing_workbook";

type TabularProcessingProgress = {
  phase: TabularPluginPhase;
  sourceId: string;
  originalName?: string;
  worksheetName?: string;
  percent?: number;
};

type TabularSheetSpec = {
  sheetName: string;
  headers: readonly string[];
};

type TabularParseContext = {
  sourceId: string;
  label?: string;
};

type TabularParsedRow = {
  rowNumber: number;
  cells: Record<string, string>;
};
```

Domain supplies `TabularSheetSpec`. Plugin maps rows to `TabularParsedRow` and emits `TabularProcessingProgress`.

---

## JSONL Plugin

```typescript
type JsonlPluginPhase = "parsing_lines";

type JsonlProcessingProgress = {
  phase: JsonlPluginPhase;
  sourceId: string;
  originalName?: string;
  percent?: number;
};

type JsonlParseContext = {
  sourceId: string;
  label?: string;
};
```

For JSONL, `ErrorDetail.rowNumber` is the 1-based physical line number. Omit `worksheetName`.

---

## Progress Phase Reference

| `phase`            | Emitter             | Layer  |
| ------------------ | ------------------- | ------ |
| `parsing_workbook` | Tabular XLSX plugin | Plugin |
| `parsing_lines`    | JSONL plugin        | Plugin |
| `loading_source`   | Domain runner       | Domain |
| `validating_rows`  | Domain runner       | Domain |
| `saving_database`  | Domain runner       | Domain |

---

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
