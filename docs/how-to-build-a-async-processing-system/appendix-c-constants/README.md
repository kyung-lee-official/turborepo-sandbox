# Appendix C: Constants and Redis Keys

This appendix collects tunables, queue names, Redis key patterns, and HTTP sentinel values for the async processing system. Constants are grouped by the same layers as the main book.

Type definitions live in [Appendix B: Shared Types](../appendix-b-shared-types/README.md). Persistence models live in [Appendix A: Prisma Data Model](../appendix-a-prisma-data-model/README.md).

These files are documentation references. Copy or adapt them into your application; they are not wired into the monorepo build.

## Folder Layout

```text
appendix-c-constants/
  shared/                          # Redis namespace and key builders
  01-optional-upload-layer/
  02-start-processing-adapter-layer/
  03-async-processing-core-layer/
  04-domain-business-layer/
```

---

## Shared (cross-layer)

[`shared/redis-key-patterns.ts`](./shared/redis-key-patterns.ts)

| Symbol                              | Value / pattern                   | Role                                       |
| ----------------------------------- | --------------------------------- | ------------------------------------------ |
| `ASYNC_PROCESSING_REDIS_NAMESPACE`  | `"async-processing"`              | Prefix for locks, pub/sub, upload sessions |
| `activeJobLockKey(domainKind)`      | `{namespace}:active:{domainKind}` | Redis string value = active `jobId`        |
| `progressChannel(jobId)`            | `{namespace}:progress:{jobId}`    | Pub/sub live progress                      |
| `terminalChannel(jobId)`            | `{namespace}:terminal:{jobId}`    | Pub/sub terminal signal                    |
| `uploadSessionKey(uploadSessionId)` | `{namespace}:upload-session:{id}` | Deferred session store                     |

Chapter: [Layer 3](../03-async-processing-core-layer/README.md) (lock, SSE), [Layer 2](../02-start-processing-adapter-layer/README.md) (session store).

---

## Layer 1: Optional Upload Layer

[`01-optional-upload-layer/upload.constants.ts`](./01-optional-upload-layer/upload.constants.ts)

| Constant                             | Default                        | Role                                               |
| ------------------------------------ | ------------------------------ | -------------------------------------------------- |
| `UPLOAD_FORM_RESERVED_KEYS`          | `autoStart`, `uploadSessionId` | Excluded from `UploadSession.context`              |
| `DEFAULT_UPLOAD_MAX_BYTES`           | 200 MiB                        | Multer size limit when env unset                   |
| `PROCESSING_UPLOAD_BASE_DIR_ENV`     | env name                       | Local disk root for multipart files                |
| `PROCESSING_UPLOAD_MAX_BYTES_ENV`    | env name                       | Override max upload bytes                          |
| `DEFAULT_PENDING_UPLOAD_TTL_SECONDS` | 86400                          | S3/COS pending state between initiate and complete |

Local storage path shape (from Layer 1):

```text
{PROCESSING_UPLOAD_BASE_DIR}/{uploadSessionId}/{sourceId}-{nanoid}.{ext}
```

Chapter: [Layer 1: Optional Upload Layer](../01-optional-upload-layer/README.md)

---

## Layer 2: Start Processing Adapter Layer

[`02-start-processing-adapter-layer/adapter.constants.ts`](./02-start-processing-adapter-layer/adapter.constants.ts)

| Constant                             | Default                              | Role                                         |
| ------------------------------------ | ------------------------------------ | -------------------------------------------- |
| `PROCESSING_START_REQUESTED_EVENT`   | `"processing.start-requested"`       | Auto-start in-process event name             |
| `UPLOAD_SESSION_REDIS_KEY_PREFIX`    | `"async-processing:upload-session:"` | Session key prefix (use `uploadSessionKey`)  |
| `DEFAULT_UPLOAD_SESSION_TTL_SECONDS` | 86400                                | Session `expiresAt` offset from save time    |
| `PROCESSING_ACTIVE_JOB_ERROR_CODE`   | `"PROCESSING_ACTIVE_JOB"`            | HTTP `409` body `code` on singleton conflict |

Chapter: [Layer 2: Start Processing Adapter Layer](../02-start-processing-adapter-layer/README.md)

---

## Layer 3: Async Processing Core Layer

[`03-async-processing-core-layer/core.constants.ts`](./03-async-processing-core-layer/core.constants.ts)

### BullMQ

| Constant                                  | Default                  | Role                                      |
| ----------------------------------------- | ------------------------ | ----------------------------------------- |
| `ASYNC_PROCESSING_QUEUE`                  | `"async-processing"`     | Queue name for worker and orchestrator    |
| `ASYNC_PROCESSING_JOB_NAME`               | `"async-processing-job"` | `queue.add` job name                      |
| `BULLMQ_JOB_OPTIONS.attempts`             | `1`                      | No automatic retry after worker finalizes |
| `BULLMQ_JOB_OPTIONS.removeOnComplete.age` | `3600`                   | Seconds before completed jobs leave Redis |
| `BULLMQ_JOB_OPTIONS.removeOnFail.age`     | `3600`                   | Seconds before failed jobs leave Redis    |

Payload carries `{ jobId, domainKind, manifestId }` only. See [Appendix B](../appendix-b-shared-types/README.md).

### Active job lock

| Constant                    | Default | Role                                             |
| --------------------------- | ------- | ------------------------------------------------ |
| `ACTIVE_JOB_TTL_SECONDS`    | 86400   | Redis lock key TTL (`SET NX EX`)                 |
| `STALE_PROCESSING_MS`       | 2 hours | Stale `processing` job threshold on lock acquire |
| `LEASE_REFRESH_INTERVAL_MS` | 60000   | Throttle `refreshLease` during domain run        |

Stale recovery on lock acquire (read lock value as `jobId`, load DB row):

| DB state                                                     | Action                                       |
| ------------------------------------------------------------ | -------------------------------------------- |
| Job row missing                                              | `DEL` lock key, retry acquire once           |
| `phase` is `complete` or `failed`                            | `DEL` lock key, retry acquire once           |
| `phase` is `processing` and older than `STALE_PROCESSING_MS` | Finalize job `failed`, `DEL` key, retry once |
| Fresh `processing` or `queued`                               | Throw `ActiveJobConflictError`               |

Worker calls `refreshLease` after claim (force) and throttled on `io.onProgress`.

### SSE and errors

| Constant              | Default | Role                                |
| --------------------- | ------- | ----------------------------------- |
| `SSE_IDLE_TIMEOUT_MS` | 60000   | Reload DB snapshot when SSE is idle |
| `INSERT_BATCH_SIZE`   | 1000    | `ProcessingJobError` batch inserts  |

Chapter: [Layer 3: Async Processing Core Layer](../03-async-processing-core-layer/README.md)

---

## Layer 4: Domain Business Layer

[`04-domain-business-layer/domain.constants.ts`](./04-domain-business-layer/domain.constants.ts)

| Constant                      | Default | Role                                                            |
| ----------------------------- | ------- | --------------------------------------------------------------- |
| `DOMAIN_PROGRESS_THROTTLE_MS` | 1000    | Min gap between `validating_rows` / `saving_database` emissions |

Use immediate progress for `loading_source` (no throttle). See progress phases in [Appendix B](../appendix-b-shared-types/README.md).

Chapter: [Layer 4: Domain Business Layer](../04-domain-business-layer/README.md)

---

## HTTP Routes (reference)

Constants do not define routes; Layer chapters do. Related endpoints:

| Method | Path                                       |
| ------ | ------------------------------------------ |
| `POST` | `/app/async-processing/:domainKind/upload` |
| `POST` | `/app/async-processing/start`              |
| `GET`  | `/app/async-processing/jobs`               |
| `GET`  | `/app/async-processing/jobs/:jobId`        |
| `GET`  | `/app/async-processing/jobs/:jobId/events` |
| `GET`  | `/app/async-processing/jobs/:jobId/errors` |

---

## What Belongs Outside This Appendix

| Concern                                                      | Document                                                |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| DTOs and progress types                                      | [Appendix B](../appendix-b-shared-types/README.md)      |
| Prisma models                                                | [Appendix A](../appendix-a-prisma-data-model/README.md) |
| Zod validation schemas                                       | Future appendix or Layer 2                              |
| Implementation patterns (Lua release script, SSE subscriber) | Layer 3                                                 |

## See Also

- [Layer 1](../01-optional-upload-layer/README.md)
- [Layer 2](../02-start-processing-adapter-layer/README.md)
- [Layer 3](../03-async-processing-core-layer/README.md)
- [Layer 4](../04-domain-business-layer/README.md)
