# Layer 3: Async Processing Core Layer

The async-processing core begins at `ProcessingOrchestratorService.startProcessing`. It owns job lifecycle, manifest persistence, admission locks, queueing, worker execution, source verification, progress publication, terminal signaling, and error persistence.

## Boundary

```text
StartProcessingInput
  -> create job and manifest
  -> acquire optional active-job lock
  -> enqueue BullMQ job
  -> worker verifies sources
  -> worker invokes DomainRunner
  -> finalize job and publish terminal signal
```

The core never handles upload bytes and never hardcodes domain business rules.

**Greenfield rule:** numbered flows in this chapter describe behavior. **Implementation pattern** blocks show the required code shape. Replicate them; do not substitute a flat single `try/catch` around domain run and finalize.

## Core Storage

| Store             | Role                                                                   |
| ----------------- | ---------------------------------------------------------------------- |
| PostgreSQL        | `ProcessingJob`, `ProcessingManifest`, `ProcessingJobError`            |
| Redis with BullMQ | Queue                                                                  |
| Redis pub/sub     | Live progress and terminal events                                      |
| Redis lock        | `global_singleton` admission per `domainKind`                          |
| Disk/object store | Input blobs produced by upload layer; worker deletes them in `finally` |

## Main Components

| Component                       | Role                                                                  |
| ------------------------------- | --------------------------------------------------------------------- |
| `ProcessingOrchestratorService` | Implements `startProcessing`                                          |
| `ProcessingJobRepository`       | Creates jobs and manifests, claims/finalizes jobs                     |
| `ProcessingJobErrorRepository`  | Persists validation errors from domain results                        |
| `DomainRegistry`                | Maps `domainKind` to runner, source specs, lock policy, upload policy |
| `ProcessingSourceReader`        | Verifies, opens, and deletes locators                                 |
| `ProcessingProcessor`           | BullMQ worker                                                         |
| `ProcessingProgressPublisher`   | Publishes progress and terminal events to Redis                       |
| `ProcessingProgressSseService`  | Streams job progress to clients                                       |
| `ProcessingActiveJobLock`       | Redis `SET NX` lock for singleton domains                             |
| `ProcessingController`          | Job list, job detail, SSE, error download                             |

## Persistence Model

PostgreSQL stores durable job history. Three models form the core contract:

| Model                | Role                                                               |
| -------------------- | ------------------------------------------------------------------ |
| `ProcessingJob`      | Lifecycle, terminal phase, outcome, aggregate counts               |
| `ProcessingManifest` | Frozen `sources` locators and optional `context` JSON              |
| `ProcessingJobError` | One row per validation failure when outcome is `validation_failed` |

Live progress stays in Redis; terminal state and counts stay on `ProcessingJob`. Errors are normalized rows, not blobs on the job row.

Full schema, field notes, indexes, and lifecycle mapping: [Appendix A: Prisma Data Model](../appendix-a-prisma-data-model/README.md).

Cross-layer DTOs and progress types: [Appendix B: Shared Types](../appendix-b-shared-types/README.md).

Constants, Redis keys, and tunables: [Appendix C: Constants and Redis Keys](../appendix-c-constants/README.md).

Validation schemas for `GET /app/async-processing/jobs` query params: [Appendix D: Validation Schemas](../appendix-d-validation-schemas/README.md). Orchestrator `sourceSpecs` checks stay in code, not Zod.

## Job and Manifest

The manifest is a frozen snapshot of the sources and context for the worker. BullMQ carries an `AsyncProcessingJobPayload` with references only (see [Appendix B](../appendix-b-shared-types/README.md)). Do not put sources, bytes, buffers, or large context into the queue payload.

## ProcessingJobRepository

The repository owns job rows and manifest rows in one place. Do not maintain a parallel manifest registry.

```typescript
interface ProcessingJobRepository {
  createQueued(input: {
    jobId: string;
    domainKind: string;
    manifestId: string;
    sources: Record<string, ProcessingSource>;
    context?: Record<string, unknown>;
  }): Promise<ProcessingJob>;

  claimProcessingPhase(jobId: string): Promise<boolean>;

  finalize(
    jobId: string,
    patch: {
      phase: "complete" | "failed";
      outcome?: ProcessingOutcome;
      processedCount?: number;
      errorCount?: number;
      completedAt: Date;
    },
  ): Promise<void>;

  findById(jobId: string): Promise<ProcessingJob | null>;
  findMany(...): Promise<{ jobs: ProcessingJob[]; nextCursor: string | null }>;
  deleteById(jobId: string): Promise<void>;

  getManifestByManifestId(manifestId: string): Promise<{
    manifestId: string;
    jobId: string;
    domainKind: string;
    sources: Record<string, ProcessingSource>;
    context?: Record<string, unknown>;
  } | null>;
}
```

### Implementation pattern: `createQueued` and `claimProcessingPhase`

Create the job and manifest in one transaction. Claim `queued` to `processing` with a conditional update so only one worker wins.

```typescript
async createQueued(input) {
  return prisma.$transaction(async (tx) => {
    const job = await tx.processingJob.create({
      data: { id: input.jobId, domainKind: input.domainKind, phase: "queued" },
    });
    await tx.processingManifest.create({
      data: {
        id: input.manifestId,
        jobId: input.jobId,
        domainKind: input.domainKind,
        sources: input.sources,
        context: input.context,
      },
    });
    return job;
  });
}

async claimProcessingPhase(jobId: string): Promise<boolean> {
  const result = await prisma.processingJob.updateMany({
    where: { id: jobId, phase: "queued" },
    data: { phase: "processing" },
  });
  return result.count === 1;
}
```

### Implementation pattern: batched job errors

When the domain returns `validation_failed`, persist `ErrorDetail` rows in batches. Use `INSERT_BATCH_SIZE` from [Appendix C](../appendix-c-constants/README.md).

```typescript
async createManyFromErrors(jobId: string, errors: readonly ErrorDetail[]) {
  if (errors.length === 0) return;

  for (let offset = 0; offset < errors.length; offset += INSERT_BATCH_SIZE) {
    const batch = errors.slice(offset, offset + INSERT_BATCH_SIZE);
    await prisma.processingJobError.createMany({
      data: batch.map((error, batchIndex) => ({
        processingJobId: jobId,
        sequence: offset + batchIndex + 1,
        payload: error,
      })),
    });
  }
}
```

## Orchestrator Flow

1. Resolve the domain registration by `domainKind`.
2. Validate required source specs.
3. Generate `jobId` and `manifestId`.
4. Create queued job and manifest in one DB transaction.
5. If lock policy is `global_singleton`, acquire `ProcessingActiveJobLock`.
6. Enqueue BullMQ job with `{ jobId, domainKind, manifestId }`.
7. Return `{ jobId, manifestId }`.
8. If lock or enqueue fails after the DB row exists, release any acquired lock, delete the job, and rethrow.

### Implementation pattern: `startProcessing`

Lock acquisition happens **after** `createQueued` so `deleteById` is a valid rollback target.

```typescript
async startProcessing(input: StartProcessingInput) {
  const registration = domainRegistry.getByDomainKind(input.domainKind);
  validateSources(input.sources, registration.sourceSpecs);

  const jobId = nanoid();
  const manifestId = nanoid();

  await jobRepository.createQueued({
    jobId,
    domainKind: input.domainKind,
    manifestId,
    sources: input.sources,
    context: input.context,
  });

  let lockAcquired = false;

  try {
    if (registration.lockPolicy.type === "global_singleton") {
      await activeJobLock.acquire(input.domainKind, jobId);
      lockAcquired = true;
    }

    await asyncProcessingQueue.add(
      ASYNC_PROCESSING_JOB_NAME,
      { jobId, domainKind: input.domainKind, manifestId },
      BULLMQ_JOB_OPTIONS,
    );
  } catch (error) {
    if (lockAcquired) {
      await activeJobLock.release(input.domainKind, jobId);
    }
    await jobRepository.deleteById(jobId);
    throw error;
  }

  return { jobId, manifestId };
}

function validateSources(
  sources: Record<string, ProcessingSource>,
  sourceSpecs: SourceSpec[],
) {
  for (const spec of sourceSpecs) {
    if (!spec.required) continue;
    const entry = sources[spec.sourceId];
    if (!entry) {
      throw new BadRequestException(`Missing required sourceId: ${spec.sourceId}`);
    }
    if (entry.sourceId !== spec.sourceId) {
      throw new BadRequestException(
        `Source key ${spec.sourceId} must match entry.sourceId ${entry.sourceId}`,
      );
    }
  }
}
```

## Processing Job Phases

`DomainRunResult.outcome` maps to DB `phase` and `outcome` as defined in [Appendix B](../appendix-b-shared-types/README.md).

Validation failures are successful job completion with collected non-critical errors.

## Active Job Lock

The active lock is per `domainKind`. Redis key: `activeJobLockKey(domainKind)` (see [Appendix C](../appendix-c-constants/README.md)). Value is the active `jobId`.

Use it when a domain can only run one active job at a time.

The lock service should:

- Acquire with Redis `SET NX EX`.
- Throw `ActiveJobConflictError` when a fresh active job exists.
- Recover stale locks by reading the DB row for the active `jobId` (table in [Appendix C](../appendix-c-constants/README.md)).
- Release with a compare-and-delete Lua script so one job cannot release another job's lock.
- Refresh the lease during long domain runs.

BullMQ concurrency does not replace this lock.

### Implementation pattern: acquire, release, refresh

**Acquire** uses `SET key jobId EX ttl NX`. On failure, run stale recovery once (read lock value as `jobId`, load DB row, apply Appendix C table), then retry acquire without recovery.

**Release** runs a Lua script on Redis so compare-and-delete is atomic:

```typescript
const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

async tryAcquire(domainKind: string, jobId: string, allowStaleRecovery: boolean) {
  const key = activeJobLockKey(domainKind);
  const ok = await redis.set(key, jobId, "EX", ACTIVE_JOB_TTL_SECONDS, "NX");
  if (ok === "OK") return;

  if (!allowStaleRecovery) {
    throw new ActiveJobConflictError(domainKind);
  }

  // Stale recovery: read activeJobId from key, load DB row, DEL or finalize stale job
  // per Appendix C table, then retry tryAcquire(domainKind, jobId, false)
}

async release(domainKind: string, jobId: string) {
  const key = activeJobLockKey(domainKind);
  await redis.eval(RELEASE_LOCK_SCRIPT, 1, key, jobId);
}

async refreshLease(domainKind: string, jobId: string) {
  const key = activeJobLockKey(domainKind);
  if ((await redis.get(key)) === jobId) {
    await redis.expire(key, ACTIVE_JOB_TTL_SECONDS);
  }
}
```

The worker calls `refreshLease` after claim (force) and throttled during `io.onProgress`. Use `LEASE_REFRESH_INTERVAL_MS` from Appendix C.

## Worker Flow

The worker must keep domain execution, post-domain finalization, and general pre-domain handling in **separate try scopes**. Never wrap finalize and publish in the same `catch` as the domain run.

Required flow:

1. Load existing job.
2. If job is already terminal, clean orphan lock if needed and return.
3. Claim `queued -> processing` with a conditional update.
4. Load manifest by `manifestId`.
5. Resolve domain registration again from manifest `domainKind`.
6. Verify every locator with `ProcessingSourceReader.verifyLocator`.
7. Build `Map<string, VerifiedProcessingSource>`.
8. Call `domainRunner.run`.
9. If domain throws, mark job failed and return.
10. If domain returns `validation_failed`, persist errors.
11. Finalize job as `complete`.
12. Publish terminal event.
13. In `finally`, release lock only if the job is terminal and the lock is held by this job.
14. In `finally`, best-effort delete verified locators.

| Failure zone | Action                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| Pre-domain   | If phase is still `processing`, call `markJobFailed`                                                              |
| Domain throw | `markJobFailed` — do not rethrow into pre-domain handler                                                          |
| Post-domain  | Log; retry `finalizeSuccess` once; `publishTerminalIfTerminal` — never map a successful domain result to `failed` |

### Implementation pattern: three try scopes

```typescript
@Processor(ASYNC_PROCESSING_QUEUE)
class ProcessingProcessor extends WorkerHost {
  private lastLeaseRefreshAt = new Map<string, number>();

  async process(job: Job<AsyncProcessingJobPayload>) {
    const { jobId, manifestId } = job.data;
    const verifiedForCleanup: VerifiedProcessingSource[] = [];

    const existing = await jobRepository.findById(jobId);
    if (existing?.phase === "complete" || existing?.phase === "failed") {
      await releaseOrphanLockIfTerminal(jobId, existing);
      return;
    }

    if (!(await jobRepository.claimProcessingPhase(jobId))) {
      const row = await jobRepository.findById(jobId);
      if (row) await releaseOrphanLockIfTerminal(jobId, row);
      return;
    }

    try {
      try {
        // pre-domain: job row, refreshLease(force), manifest, buildVerifiedSources, refreshLease(force)
        let result: DomainRunResult;

        try {
          result = await registration.domainRunner.run(jobId, verifiedSources, {
            openStream: (source) =>
              sourceReader.openReadStream(source.verifiedLocator),
            onProgress: async (detail) => {
              await progressPublisher.publishProgress(jobId, detail);
              await refreshLeaseIfNeeded(
                registration,
                domainKind,
                jobId,
                false,
              );
            },
            context: manifest.context,
          });
        } catch {
          await markJobFailed(jobId);
          return;
        }

        try {
          await finalizeSuccess(jobId, result);
          await publishTerminalIfTerminal(jobId);
        } catch {
          // log; retry finalizeSuccess once; publishTerminalIfTerminal
        }
      } catch {
        const row = await jobRepository.findById(jobId);
        if (row?.phase === "processing") await markJobFailed(jobId);
      }
    } finally {
      const row = await jobRepository.findById(jobId);
      if (
        row &&
        (row.phase === "complete" || row.phase === "failed") &&
        (await activeJobLock.isHeldBy(jobId, row.domainKind))
      ) {
        await activeJobLock.release(row.domainKind, jobId);
      }
      for (const source of verifiedForCleanup) {
        try {
          await sourceReader.deleteLocator(source.verifiedLocator);
        } catch {
          /* log */
        }
      }
    }
  }
}
```

### Implementation pattern: finalize helpers

```typescript
async finalizeSuccess(jobId: string, result: DomainRunResult) {
  if (result.outcome === "validation_failed") {
    await jobErrorRepository.createManyFromErrors(jobId, result.errors);
  }
  await jobRepository.finalize(jobId, {
    phase: "complete",
    outcome: result.outcome,
    processedCount: result.processedCount,
    errorCount: result.errorCount,
    completedAt: new Date(),
  });
}

async markJobFailed(jobId: string) {
  await jobRepository.finalize(jobId, {
    phase: "failed",
    outcome: "failed",
    completedAt: new Date(),
  });
  try {
    await progressPublisher.publishTerminal(jobId, { phase: "failed" });
  } catch {
    /* best effort */
  }
}

async refreshLeaseIfNeeded(
  registration: DomainKindRegistration,
  domainKind: string,
  jobId: string,
  force: boolean,
) {
  if (registration.lockPolicy.type !== "global_singleton") return;
  const now = Date.now();
  const last = lastLeaseRefreshAt.get(jobId) ?? 0;
  if (force || now - last >= LEASE_REFRESH_INTERVAL_MS) {
    await activeJobLock.refreshLease(domainKind, jobId);
    lastLeaseRefreshAt.set(jobId, now);
  }
}
```

## Source Verification

Verification happens once in the worker after the job is claimed and before domain code runs.

| Locator    | Verification                                    |
| ---------- | ----------------------------------------------- |
| Local file | `stat(path)`, ensure it is a file, capture size |
| S3 object  | `HeadObject`, capture size and ETag             |
| COS object | `headObject`, capture size and ETag             |

Domain runners receive `VerifiedProcessingSource` and should not re-verify locators.

### Implementation pattern: `verifyLocator`

```typescript
async verifyLocator(locator: SourceLocator): Promise<VerifiedSourceLocator> {
  switch (locator.kind) {
    case "local": {
      const fileStat = await stat(locator.path);
      if (!fileStat.isFile()) {
        throw new Error(`Local path is not a file: ${locator.path}`);
      }
      return { ...locator, sizeBytes: fileStat.size };
    }
    case "object": {
      if (locator.provider === "s3") {
        const head = await s3.send(
          new HeadObjectCommand({ Bucket: locator.bucket, Key: locator.key }),
        );
        return {
          ...locator,
          sizeBytes: head.ContentLength ?? 0,
          etag: head.ETag,
        };
      }
      const head = await cosHeadObject(locator.bucket, locator.key);
      return {
        ...locator,
        sizeBytes: head.contentLength,
        etag: head.etag,
      };
    }
    default: {
      const _exhaustive: never = locator;
      return _exhaustive;
    }
  }
}
```

COS SDK note: `cos-nodejs-sdk-v5` is a CommonJS `export =` module; use `import COS = require("cos-nodejs-sdk-v5")` in TypeScript when needed.

## Progress and SSE

Progress is live data, not job history. Job phase changes are **not** pub/sub events — clients rely on connect snapshot, idle DB reload, or `GET /app/async-processing/jobs/:jobId`.

- Worker calls `io.onProgress`.
- Core publishes to `progressChannel(jobId)` and terminal events to `terminalChannel(jobId)` (see [Appendix C](../appendix-c-constants/README.md)).
- SSE sends an initial DB snapshot.
- SSE forwards progress events.
- SSE reloads a final DB snapshot on terminal event and closes.
- Idle SSE connections reload the DB periodically to catch missed terminal state.

### Implementation pattern: publisher

```typescript
async publishProgress(jobId: string, progress: unknown) {
  await redis.publish(
    progressChannel(jobId),
    JSON.stringify({ jobId, progress }),
  );
}

async publishTerminal(jobId: string, phase: "complete" | "failed") {
  await redis.publish(
    terminalChannel(jobId),
    JSON.stringify({ jobId, phase }),
  );
}
```

### Implementation pattern: SSE subscriber

Use a **dedicated** Redis subscriber connection per SSE stream (not the shared command client). Nest can expose this as an RxJS `Observable<MessageEvent>`.

```typescript
streamJobEvents(jobId: string): Observable<MessageEvent> {
  return new Observable((subscriber) => {
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let sub: Redis | undefined;

    const progressCh = progressChannel(jobId);
    const terminalCh = terminalChannel(jobId);

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(async () => {
        const row = await jobRepository.findById(jobId);
        if (!row) {
          subscriber.complete();
          return;
        }
        subscriber.next({ data: toSnapshot(row) });
        if (row.phase === "complete" || row.phase === "failed") {
          subscriber.complete();
          return;
        }
        resetIdleTimer();
      }, SSE_IDLE_TIMEOUT_MS);
    };

    void (async () => {
      const job = await jobRepository.findById(jobId);
      if (!job) {
        subscriber.error(new NotFoundException(`Job not found: ${jobId}`));
        return;
      }
      if (job.phase === "complete" || job.phase === "failed") {
        subscriber.next({ data: toSnapshot(job) });
        subscriber.complete();
        return;
      }

      sub = new Redis({ host, port, maxRetriesPerRequest: null });

      const reloadSnapshotAndComplete = async () => {
        const row = await jobRepository.findById(jobId);
        if (row) subscriber.next({ data: toSnapshot(row) });
        subscriber.complete();
      };

      sub.on("message", (channel, message) => {
        if (channel === progressCh) {
          subscriber.next({ data: JSON.parse(message) });
          resetIdleTimer();
        }
        if (channel === terminalCh) {
          void reloadSnapshotAndComplete();
        }
      });
      await sub.subscribe(progressCh, terminalCh);
      subscriber.next({ data: toSnapshot(job) });
      resetIdleTimer();
    })();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      void sub?.unsubscribe(progressCh, terminalCh);
      sub?.disconnect();
    };
  });
}
```

## HTTP API

| Method | Path                                       | Response                        |
| ------ | ------------------------------------------ | ------------------------------- |
| `GET`  | `/app/async-processing/jobs`               | Paginated list                  |
| `GET`  | `/app/async-processing/jobs/:jobId`        | Job snapshot                    |
| `GET`  | `/app/async-processing/jobs/:jobId/events` | SSE stream                      |
| `GET`  | `/app/async-processing/jobs/:jobId/errors` | NDJSON when `validation_failed` |

List query validation: [Appendix D](../appendix-d-validation-schemas/README.md).

## Error Download

When a domain returns `validation_failed`, the worker persists `ErrorDetail[]` through `ProcessingJobErrorRepository`.

Serve persisted job errors as NDJSON (`application/x-ndjson`). Optional XLSX exports can be built with shared import utilities, but the worker should persist structured errors, not blobs.

## Nest Module Layout

Keep the core in one module. Start adapters import the core module (not the umbrella module) to avoid circular dependencies.

```text
async-processing/
  async-processing.module.ts          # umbrella — imports core + start adapters
  async-processing-core/
    async-processing-core.module.ts
    processing-orchestrator.service.ts
    processing.processor.ts
    processing-job.repository.ts
    processing-job-error.repository.ts
    processing-active-job.lock.ts
    processing-source.reader.ts
    processing-progress-publisher.service.ts
    processing-progress-sse.service.ts
    processing.controller.ts
    domain-registry.service.ts
  start-processing-adapters/          # Layer 2 — separate chapter
```

```typescript
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue({ name: ASYNC_PROCESSING_QUEUE }),
  ],
  controllers: [ProcessingController],
  providers: [
    ProcessingOrchestratorService,
    ProcessingJobRepository,
    ProcessingJobErrorRepository,
    ProcessingSourceReader,
    ProcessingActiveJobLock,
    ProcessingProgressPublisher,
    ProcessingProgressSseService,
    ProcessingProcessor,
    DomainRegistry,
  ],
  exports: [
    ProcessingOrchestratorService,
    DomainRegistry,
    ProcessingJobRepository,
    ProcessingJobErrorRepository,
  ],
})
export class AsyncProcessingCoreModule {}
```

`DomainRegistry` is populated at app bootstrap — each domain module registers its runner, `sourceSpecs`, lock policy, and optional upload MIME policy. Domain modules inject `DomainRegistry` only; they do not import upload code.

## Core Invariants

- Core starts at `startProcessing`.
- Core does not know upload session details.
- Job history lives in the database, not only Redis.
- Manifest locators are frozen before enqueue.
- BullMQ payload carries references only.
- Worker claims jobs with a single-winner conditional update.
- Worker verifies locators before domain run.
- Domain run and finalize are not wrapped in one broad catch.
- Successful domain results must not be overwritten as failed because terminal publication failed.
- Cleanup happens in `finally`.
- Domain-specific code does not live in the core.

## Rules and Anti-Patterns

| Rule                                                                  | Rationale                                            |
| --------------------------------------------------------------------- | ---------------------------------------------------- |
| Boundary at `startProcessing`                                         | Upload types and session trust stay in Layers 1–2    |
| Job history in DB                                                     | Redis is for queue, lock, and live progress only     |
| One repo for job + manifest                                           | Avoid drift between parallel manifest stores         |
| Verify once in worker                                                 | Domain gets `VerifiedProcessingSource` only          |
| `attempts: 1` plus idempotency guard                                  | No double domain runs after finalize                 |
| `claimProcessingPhase` via conditional `updateMany`                   | Single-winner `queued` to `processing`               |
| `global_singleton`: Redis lock plus `refreshLease`                    | BullMQ concurrency is not domain admission           |
| `finally`: release when terminal and `isHeldBy`, then delete locators | Never release while phase is `processing`            |
| Separate catches: domain vs post-domain finalize                      | Broad catch overwrites successful terminal rows      |
| Queue refs only (`manifestId`)                                        | No bytes, buffers, or full `sources` on BullMQ       |
| `ActiveJobConflictError` in lock service                              | Layer 2 adapter maps to HTTP 409                     |
| Lock after `createQueued`                                             | Rollback target exists on acquire or enqueue failure |
| Redis pub/sub for live progress                                       | Do not persist every progress tick to DB             |
| No domain business code in core                                       | Domains register via `DomainRegistry` only           |
