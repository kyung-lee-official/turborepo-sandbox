/**
 * Appendix C — Layer 2: Start Processing Adapter Layer
 */

import { uploadSessionKey } from "../shared/redis-key-patterns";

/** In-process event name for auto-start after upload ingest */
export const PROCESSING_START_REQUESTED_EVENT =
  "processing.start-requested" as const;

/** Redis key prefix for persisted UploadSession records */
export const UPLOAD_SESSION_REDIS_KEY_PREFIX =
  "async-processing:upload-session:" as const;

/** Default TTL when saving UploadSession to Redis or DB */
export const DEFAULT_UPLOAD_SESSION_TTL_SECONDS = 60 * 60 * 24;

/** HTTP 409 response body code for global_singleton conflict */
export const PROCESSING_ACTIVE_JOB_ERROR_CODE =
  "PROCESSING_ACTIVE_JOB" as const;

export { uploadSessionKey };
