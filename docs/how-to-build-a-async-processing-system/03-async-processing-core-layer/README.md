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

## Core Storage

| Store | Role |
| --- | --- |
| PostgreSQL | `ProcessingJob`, `ProcessingManifest`, `ProcessingJobError` |
| Redis with BullMQ | Queue |
| Redis pub/sub | Live progress and terminal events |
| Redis lock | `global_singleton` admission per `domainKind` |
| Disk/object store | Input blobs produced by upload layer; worker deletes them in `finally` |

## Main Components

| Component | Role |
| --- | --- |
| `ProcessingOrchestratorService` | Implements `startProcessing` |
| `ProcessingJobRepository` | Creates jobs and manifests, claims/finalizes jobs |
| `ProcessingJobErrorRepository` | Persists validation errors from domain results |
| `DomainRegistry` | Maps `domainKind` to runner, source specs, lock policy, upload policy |
| `ProcessingSourceReader` | Verifies, opens, and deletes locators |
| `ProcessingProcessor` | BullMQ worker |
| `ProcessingProgressPublisher` | Publishes progress and terminal events to Redis |
| `ProcessingProgressSseService` | Streams job progress to clients |
| `ProcessingActiveJobLock` | Redis `SET NX` lock for singleton domains |
| `ProcessingController` | Job list, job detail, SSE, error download |

## Persistence Model

PostgreSQL stores durable job history. Three models form the core contract:

| Model | Role |
| --- | --- |
| `ProcessingJob` | Lifecycle, terminal phase, outcome, aggregate counts |
| `ProcessingManifest` | Frozen `sources` locators and optional `context` JSON |
| `ProcessingJobError` | One row per validation failure when outcome is `validation_failed` |

Live progress stays in Redis; terminal state and counts stay on `ProcessingJob`. Errors are normalized rows, not blobs on the job row.

Full schema, field notes, indexes, and lifecycle mapping: [Appendix A: Prisma Data Model](../appendix-a-prisma-data-model/README.md).

## Job and Manifest

The manifest is a frozen snapshot of the sources and context for the worker.

```ts
type AsyncProcessingJobPayload = {
  jobId: string;
  domainKind: string;
  manifestId: string;
};
```

BullMQ payloads carry references only. Do not put sources, bytes, buffers, or large context into the queue payload.

## Orchestrator Flow

1. Resolve the domain registration by `domainKind`.
2. Validate required source specs.
3. Generate `jobId` and `manifestId`.
4. Create queued job and manifest in one DB transaction.
5. If lock policy is `global_singleton`, acquire `ProcessingActiveJobLock`.
6. Enqueue BullMQ job with `{ jobId, domainKind, manifestId }`.
7. Return `{ jobId, manifestId }`.
8. If lock or enqueue fails after the DB row exists, release any acquired lock, delete the job, and rethrow.

## Processing Job Phases

| Domain result or failure | DB phase | DB outcome |
| --- | --- | --- |
| Domain returns success | `complete` | `success` |
| Domain returns validation errors | `complete` | `validation_failed` |
| Uncaught failure | `failed` | `failed` |

Validation failures are successful job completion with collected non-critical errors.

## Active Job Lock

The active lock is per `domainKind`:

```text
async-processing:active:{domainKind} -> {jobId}
```

Use it when a domain can only run one active job at a time.

The lock service should:

- Acquire with Redis `SET NX EX`.
- Throw `ActiveJobConflictError` when a fresh active job exists.
- Recover stale locks by reading the DB row for the active `jobId`.
- Release with a compare-and-delete script so one job cannot release another job's lock.
- Refresh the lease during long domain runs.

BullMQ concurrency does not replace this lock.

## Worker Flow

The worker must keep domain execution, post-domain finalization, and general pre-domain handling in separate try scopes.

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

## Source Verification

Verification happens once in the worker after the job is claimed and before domain code runs.

| Locator | Verification |
| --- | --- |
| Local file | `stat(path)`, ensure it is a file, capture size |
| S3 object | `HeadObject`, capture size and ETag |
| COS object | `headObject`, capture size and ETag |

Domain runners receive `VerifiedProcessingSource` and should not re-verify locators.

## Progress and SSE

Progress is live data, not job history.

- Worker calls `io.onProgress`.
- Core publishes to `async-processing:progress:{jobId}`.
- Terminal events publish to `async-processing:terminal:{jobId}`.
- SSE sends an initial DB snapshot.
- SSE forwards progress events.
- SSE reloads a final DB snapshot on terminal event and closes.
- Idle SSE connections reload the DB periodically to catch missed terminal state.

## Error Download

When a domain returns `validation_failed`, the worker persists `ErrorDetail[]` through `ProcessingJobErrorRepository`.

Recommended API:

```text
GET /applications/async-processing/jobs/:jobId/errors
```

Serve persisted job errors as NDJSON (`application/x-ndjson`). Optional XLSX exports can be built with shared import utilities, but the worker should persist structured errors, not blobs.

## Core Invariants

- Core starts at `startProcessing`.
- Core does not know upload session details.
- Job history lives in the database, not only Redis.
- Manifest locators are frozen before enqueue.
- Queue payload carries references only.
- Worker claims jobs with a single-winner conditional update.
- Worker verifies locators before domain run.
- Domain run and finalize are not wrapped in one broad catch.
- Successful domain results must not be overwritten as failed because terminal publication failed.
- Cleanup happens in `finally`.
- Domain-specific code does not live in the core.
