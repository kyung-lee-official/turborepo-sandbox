/**
 * Appendix C — Layer 3: Async Processing Core Layer
 */

import {
  activeJobLockKey,
  progressChannel,
  terminalChannel,
} from "../shared/redis-key-patterns";

/** BullMQ queue name — must match @Processor and BullModule.registerQueue */
export const ASYNC_PROCESSING_QUEUE = "async-processing" as const;

/** BullMQ job name passed to queue.add */
export const ASYNC_PROCESSING_JOB_NAME = "async-processing-job" as const;

/** Active-job lock TTL (Redis SET EX) */
export const ACTIVE_JOB_TTL_SECONDS = 60 * 60 * 24;

/**
 * Jobs in processing longer than this are treated as stale during lock acquire.
 * Stale recovery finalizes the active job failed and deletes the lock key.
 */
export const STALE_PROCESSING_MS = 2 * 60 * 60 * 1000;

/** SSE idle reload: re-read DB snapshot when no pub/sub message arrives */
export const SSE_IDLE_TIMEOUT_MS = 60_000;

/** Minimum interval between lock lease refreshes during long domain runs */
export const LEASE_REFRESH_INTERVAL_MS = 60_000;

/** BullMQ enqueue options */
export const BULLMQ_JOB_OPTIONS = {
  attempts: 1,
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 3600 },
} as const;

/** ProcessingJobError createMany batch size */
export const INSERT_BATCH_SIZE = 1000;

export { activeJobLockKey, progressChannel, terminalChannel };
