---
name: async-processing
description: >-
  Async processing layer from startProcessing onward: orchestrator, ProcessingManifest
  via Prisma, BullMQ (Redis), live progress pub/sub, source reader, worker,
  domainKind registry. Use when implementing startProcessing or job orchestration.
---

# Async processing

## Goal

**Everything from `startProcessing` onward.** Source-agnostic job orchestration — inputs arrive as validated **`StartProcessingInput`** from [import-upload-handoff](../import-upload-handoff/SKILL.md) adapters.

**Processing records** (`ProcessingJob`, `ProcessingManifest`) persist in **DB**. **Redis** is for **BullMQ** and **live domain progress** (SSE during the run). Domain business logic and **`ErrorDetail`** — plugin skills.

**Storage verification** is worker step 1. Upload and start API/event paths are upstream.

---

## Architecture

Boundary at **`startProcessing`**. Dashed arrows: upstream API and event adapters (handoff layer).

```mermaid
---
config:
  theme: neo-dark
---
flowchart TD
  apiAdp["API adapter"]
  eventAdp["event adapter"]
  start["startProcessing"]
  persist["ProcessingJobRepository createQueued"]
  enqueue["BullMQ queue.add"]
  worker["BullMQ processor"]
  verify["verifyLocator"]
  domain["domain runner"]

  apiAdp -.-> start
  eventAdp -.-> start
  start --> persist
  persist --> enqueue
  enqueue --> worker
  worker --> verify
  verify --> domain
```

Solid arrows: this skill. Dashed arrows: handoff layer — see [import-upload-handoff](../import-upload-handoff/SKILL.md).

| Piece | Role |
| ----- | ---- |
| **[startProcessing](#inside-startprocessing)** | Processing boundary — first method in this layer |
| **[StartProcessingInput](#inbound-from-adapters)** | Inbound DTO from adapters (`domainKind` + `sources`) |
| **[ProcessingJob](#processing-records-prisma)** | Durable processing record — phase, outcome, counts |
| **[ProcessingManifest](#processing-records-prisma)** | Input snapshot; same DB transaction as job |
| **[ProcessingJobRepository](#processingjobrepository)** | Create, update, finalize job; load manifest by `manifestId` |
| **[ProcessingSourceReader](#processingsourcereader)** | `verifyLocator`, `openReadStream`, `deleteLocator` |
| **[DomainRunner](#domain-boundary)** | Per-`domainKind` handler invoked by the worker |
| **[BullMQ queue](#job-queue-bullmq)** | Dispatches worker jobs; payload is refs only |
| **[ProcessingProgressPublisher](#live-progress-and-sse)** | Redis pub/sub for domain `onProgress` during the run |

---

## Terminology

| Term | Meaning |
| ---- | ------- |
| **[StartProcessingInput](#inbound-from-adapters)** | Inbound DTO — built by handoff adapters |
| **[domainKind](#domain-registry)** | Registry key for domain runner and `sourceSpecs` (e.g. `sales-report`) |
| **[DomainKindRegistration](#domain-registry)** | `domainRunner` + `sourceSpecs` + `lockPolicy` for one `domainKind` |
| **[SourceSpec](#registration-processing-layer)** | Required/optional `sourceId` in a registration |
| **[sourceId](#inbound-from-adapters)** | Routing key for one input (e.g. `mainWorkbook`) |
| **[SourceLocator](#inbound-from-adapters)** | Opaque read handle: local path, object key, … |
| **[ProcessingJob](#processing-records-prisma)** | DB row — durable job lifecycle and outcome |
| **[ProcessingManifest](#processing-records-prisma)** | Input snapshot linked to `ProcessingJob` |
| **[ProcessingPhase](#processing-lifecycle-types)** | `queued` \| `processing` \| `complete` \| `failed` |
| **[ProcessingOutcome](#processing-lifecycle-types)** | `success` \| `validation_failed` \| `failed` |
| **[manifestId](#inside-startprocessing)** / **[jobId](#inside-startprocessing)** | Created in `startProcessing`; `jobId` === `ProcessingJob.id` |
| **[storage verification](#worker)** | Worker step 1: stat / HEAD on each `SourceLocator` |
| **[ASYNC_PROCESSING_QUEUE](#job-queue-bullmq)** | BullMQ queue name (`"async-processing"`) |
| **[AsyncProcessingJobPayload](#job-queue-bullmq)** | BullMQ job data — `jobId`, `domainKind`, `manifestId` only |
| **[ProcessingProgressEvent](#live-progress-and-sse)** | Ephemeral Redis pub/sub payload — domain progress only |
| **[DomainRunResult](#domain-boundary)** | Fixed return shape from `DomainRunner.run` — worker maps to DB |
| **[DomainRunner](#domain-boundary)** | Per-`domainKind` handler invoked by the worker |

Upload handoff vocabulary stays in [import-upload-handoff](../import-upload-handoff/SKILL.md). **`ErrorDetail`** — plugin skills (domain-internal).

---

## Types

### Inbound (from adapters)

```typescript
type StartProcessingInput = {
  domainKind: string;
  sources: Record<string, ProcessingSource>;
};

type ProcessingSource = {
  sourceId: string;
  label?: string;
  mimeType?: string;
  locator: SourceLocator;
};

type SourceLocator =
  | { kind: "local"; path: string; declaredSizeBytes?: number }
  | {
      kind: "object";
      provider: "s3" | "cos";
      bucket: string;
      key: string;
      declaredSizeBytes?: number;
    };
```

### Registration (processing layer)

```typescript
type SourceSpec = { sourceId: string; required: boolean };

type DomainKindRegistration = {
  domainRunner: DomainRunner;
  sourceSpecs: SourceSpec[];
  lockPolicy: ProcessingLockPolicy;
};

type ProcessingLockPolicy = { type: "none" } | { type: "global_singleton" };
```

Orchestrator validates `input.sources` against `DomainKindRegistration.sourceSpecs`.

### Processing lifecycle types

```typescript
type ProcessingPhase = "queued" | "processing" | "complete" | "failed";

type ProcessingOutcome = "success" | "validation_failed" | "failed";
```

Mirror Prisma enums in application code (or import from generated client).

### Verified locator

```typescript
type VerifiedSourceLocator = SourceLocator & {
  sizeBytes: number;
  etag?: string;
};
```

### Domain boundary

Fixed contract between worker and domain — **not generic**. Domain maps internal results to this shape before returning.

```typescript
type DomainRunResult =
  | { outcome: "success"; processedCount: number; errorCount: 0 }
  | {
      outcome: "validation_failed";
      processedCount: number;
      errorCount: number;
      errorBlob?: Buffer;
    };

type DomainRunner = {
  domainKind: string;
  run(
    sources: Map<string, ProcessingSource>,
    io: {
      openStream: (source: ProcessingSource) => Promise<Readable>;
      onProgress: (detail: unknown) => Promise<void>;
    },
  ): Promise<DomainRunResult>;
};
```

**Worker mapping to `ProcessingJob`**

| `DomainRunResult` | DB `phase` | DB `outcome` |
| --- | --- | --- |
| `success` | `complete` | `success` |
| `validation_failed` | `complete` | `validation_failed` |
| Uncaught throw | `failed` | `failed` (or omit) |

On `validation_failed`, store `errorBlob` externally and set `errorStorageKey`.

### BullMQ payload

```typescript
export const ASYNC_PROCESSING_QUEUE = "async-processing" as const;

/** BullMQ job data — small refs only; never file bytes or locators */
type AsyncProcessingJobPayload = {
  jobId: string;
  domainKind: string;
  manifestId: string;
};
```

### Live progress (Redis only)

```typescript
/** Published on Redis during domainRunner.run — not persisted per tick */
type ProcessingProgressEvent = {
  jobId: string;
  progress: unknown; // domain/plugin shape, e.g. TabularProcessingProgress
};

/** Published by worker after finalize — signals SSE to load terminal snapshot from DB */
type ProcessingTerminalEvent = {
  jobId: string;
  phase: "complete" | "failed";
};
```

---

## Processing records (Prisma)

Durable processing history lives in **PostgreSQL** via Prisma. User runs migrations themselves after schema edits.

```prisma
enum ProcessingPhase {
  queued
  processing
  complete
  failed
}

enum ProcessingOutcome {
  success
  validation_failed
  failed
}

model ProcessingJob {
  id              String             @id // jobId (nanoid)
  domainKind      String
  phase           ProcessingPhase    @default(queued)
  outcome         ProcessingOutcome?
  processedCount  Int?
  errorCount      Int?
  errorStorageKey String?            // path/key to error blob; bytes not inline
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  completedAt     DateTime?

  manifest ProcessingManifest?
}

model ProcessingManifest {
  id         String   @id // manifestId (nanoid)
  jobId      String   @unique
  domainKind String
  sources    Json     // Record<sourceId, ProcessingSource>
  createdAt  DateTime @default(now())

  job ProcessingJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
}
```

| Field | Notes |
| ----- | ----- |
| `ProcessingJob.phase` | Updated in DB at queued → processing → complete/failed |
| `ProcessingJob.outcome` | Set when `phase` is terminal |
| `sources` | JSON copy of validated `StartProcessingInput.sources` at enqueue time |
| `errorStorageKey` | Set on `validation_failed` when domain returns an error blob |

After `prisma generate`, map rows to API/SSE DTOs at the boundary — do not leak Prisma types into domain runners.

---

## ProcessingJobRepository

Single access point for **`ProcessingJob`** and **`ProcessingManifest`** (Prisma). No separate manifest registry.

```typescript
interface ProcessingJobRepository {
  createQueued(input: {
    jobId: string;
    domainKind: string;
    manifestId: string;
    sources: Record<string, ProcessingSource>;
  }): Promise<ProcessingJob>;

  updatePhase(jobId: string, phase: ProcessingPhase): Promise<void>;

  finalize(
    jobId: string,
    patch: {
      phase: "complete" | "failed";
      outcome?: ProcessingOutcome;
      processedCount?: number;
      errorCount?: number;
      errorStorageKey?: string;
      completedAt: Date;
    },
  ): Promise<void>;

  findById(jobId: string): Promise<ProcessingJob | null>;

  getManifestByManifestId(manifestId: string): Promise<{
    manifestId: string;
    jobId: string;
    domainKind: string;
    sources: Record<string, ProcessingSource>;
  } | null>;
}
```

`createQueued` writes **`ProcessingJob`** and **`ProcessingManifest`** in one transaction.

---

## ProcessingSourceReader

```typescript
interface ProcessingSourceReader {
  verifyLocator(locator: SourceLocator): Promise<VerifiedSourceLocator>;
  openReadStream(locator: VerifiedSourceLocator): Promise<Readable>;
  deleteLocator(locator: SourceLocator): Promise<void>;
}
```

---

## Domain registry

```typescript
registry.register("sales-report", {
  domainRunner: salesReportDomainRunner,
  sourceSpecs: [{ sourceId: "mainWorkbook", required: true }],
  lockPolicy: { type: "global_singleton" },
});
```

Worker calls **`DomainRunner`** from the registry. Return type is **`DomainRunResult`** — see [Domain boundary](#domain-boundary). Domain-internal validation uses **`ErrorDetail`** in plugin skills.

---

## Inside startProcessing

1. Validate `input.sources` for `input.domainKind` (registry `sourceSpecs`).
2. Lock policy (active job per `domainKind` when `global_singleton`).
3. Create `jobId`, `manifestId`.
4. **`ProcessingJobRepository.createQueued`** — job + manifest in DB, `phase: queued`.
5. **Enqueue** BullMQ job.
6. Return `{ jobId, manifestId }`.

```typescript
await this.asyncProcessingQueue.add(
  "async-processing-job",
  { jobId, domainKind: input.domainKind, manifestId },
  {
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 3600 },
  },
);
```

---

## Job queue (BullMQ)

Use **BullMQ** via `@nestjs/bullmq` for async dispatch after `startProcessing`.

### Module registration

```typescript
@Module({
  imports: [
    RedisModule,
    BullModule.registerQueue({ name: ASYNC_PROCESSING_QUEUE }),
  ],
  providers: [
    ProcessingOrchestratorService,
    ProcessingJobRepository,
    ProcessingSourceReader,
    ProcessingProgressPublisher,
    ProcessingProgressSseService,
    ProcessingProcessor,
    DomainRegistry,
  ],
})
export class AsyncProcessingModule {}
```

### Queue payload rules

| Put on queue | Do not put on queue |
| --- | --- |
| `jobId`, `domainKind`, `manifestId` | File bytes, buffers, streams |
| | Full `sources` map (load from DB by `manifestId`) |
| | `SourceLocator` paths or object keys |

### Storage roles

| Store | Role |
| ----- | ---- |
| **PostgreSQL** | `ProcessingJob`, `ProcessingManifest` — durable processing records |
| **Redis (BullMQ)** | Job queue |
| **Redis (pub/sub)** | `ProcessingProgressEvent` (live) + `ProcessingTerminalEvent` (terminal signal) |
| **Object store / disk** | Error report blob; DB holds `errorStorageKey` only |

Lock policy may use Redis or DB — pick one implementation per deployment.

---

## Live progress and SSE

### Channels

| Channel | Payload | When |
| --- | --- | --- |
| `async-processing:progress:{jobId}` | `ProcessingProgressEvent` | Each domain `onProgress` |
| `async-processing:terminal:{jobId}` | `ProcessingTerminalEvent` | After worker `finalize` |

### SSE handler flow

1. Client opens `GET jobs/:jobId/events`.
2. Handler loads **`ProcessingJob`** from DB — if already `complete` or `failed`, emit one snapshot and close.
3. Subscribe to **progress** and **terminal** Redis channels for `jobId`.
4. On **progress** message — forward `{ jobId, progress }` to client (domain shape).
5. On **terminal** message — **reload `ProcessingJob` from DB**, emit full snapshot (`phase`, `outcome`, counts, `errorStorageKey`), close stream.
6. Heartbeat while subscribed; unsubscribe on client disconnect.

Worker publishes **terminal** immediately after successful `finalize` (including `validation_failed` with `phase: complete`).

```typescript
// io.onProgress inside domainRunner.run
await this.progressPublisher.publishProgress(jobId, detail);

// after finalize in worker
await this.progressPublisher.publishTerminal(jobId, { phase: patch.phase });
```

---

## Worker

`@Processor(ASYNC_PROCESSING_QUEUE)` — canonical steps:

1. **`updatePhase(jobId, "processing")`**.
2. **`getManifestByManifestId(manifestId)`** from repository.
3. **`verifyLocator`** per source; build verified source map.
4. **`domainRunner.run(...)`** — `onProgress` calls `publishProgress` only.
5. Map **`DomainRunResult`** → **`finalize`** (`validation_failed`: `phase: complete`, `outcome: validation_failed`).
6. Store error blob when present; set `errorStorageKey`.
7. **`publishTerminal`** so SSE reloads DB snapshot.
8. Cleanup locators; clear active-job lock when policy requires it.

On uncaught error: `finalize` with `phase: failed`, `publishTerminal`, rethrow for BullMQ retry policy.

```typescript
@Injectable()
@Processor(ASYNC_PROCESSING_QUEUE)
export class ProcessingProcessor extends WorkerHost {
  async process(job: Job<AsyncProcessingJobPayload>) {
    const { jobId, manifestId } = job.data;
    await this.jobRepository.updatePhase(jobId, "processing");

    try {
      const manifest = await this.jobRepository.getManifestByManifestId(manifestId);
      const registration = this.domainRegistry.getByDomainKind(manifest!.domainKind);
      const result = await registration.domainRunner.run(/* sources, io */);
      // finalize from result, publishTerminal
    } catch (error) {
      await this.jobRepository.finalize(jobId, {
        phase: "failed",
        outcome: "failed",
        completedAt: new Date(),
      });
      await this.progressPublisher.publishTerminal(jobId, { phase: "failed" });
      throw error;
    }
  }
}
```

---

## Frontend

1. Upload handoff → `{ sources }` — [import-upload-handoff](../import-upload-handoff/SKILL.md).
2. **API controller** `POST .../start` → adapter → `startProcessing` — handoff skill.
3. SSE `jobs/:jobId/events` — live progress from Redis; terminal snapshot from DB after terminal event.
4. `GET jobs/:jobId` — load `ProcessingJob` from DB for history after SSE closes.

---

## Invariants

1. **Source-agnostic** — no upload types in orchestrator or worker.
2. **Boundary at `startProcessing`** — nothing in this layer runs before that call.
3. **Processing records in DB** — phase and outcome are durable; not Redis-only.
4. **Redis for queue + live progress** — not the system of record for job history.
5. **One repository for job + manifest** — no parallel manifest registry.
6. **Verify in worker** — not at upload time.
7. **No domain row data in processing tables** — business persistence stays in domain layer.

---

## What not to do

| Anti-pattern | Why |
| ------------ | --- |
| `Import` in processing/domain type names | Use `DomainRunner`, `domainKind`, `processedCount` |
| Separate manifest registry + repository | Single `ProcessingJobRepository` (Prisma) |
| Redis-only job history | DB holds durable `ProcessingJob` |
| Write domain progress every tick to DB | Redis pub/sub for live SSE |
| Business rows in `ProcessingJob` | Domain layer owns domain models |
| File bytes on BullMQ job or in DB JSON | Locators in manifest; blobs in object store |
| API/event entry points in this module | Belong in import-upload-handoff |

---

## Suggested module layout

```text
processing/
  async-processing.types.ts
  async-processing.module.ts
  domain-registry.service.ts
  processing-orchestrator.service.ts
  processing-job.repository.ts           # Prisma — job + manifest
  processing-source.reader.ts
  processing-progress-publisher.service.ts
  processing-progress-sse.service.ts
  processing.processor.ts
```

Prisma schema — `packages/database/prisma/schema.prisma` (or app-owned schema). Run **`prisma generate`** after edits; user applies migrations.

---

## Agent invocation

| Task | Skills |
| ---- | ------ |
| Upload, handoff sources, API/event adapters | `import-upload-handoff` |
| Orchestrator, worker, processing records, SSE | `async-processing` |
| Domain runner implementation, ErrorDetail | plugin skills (+ `DomainRunResult` in this skill) |
