/**
 * Appendix C — Layer 1: Optional Upload Layer
 */

/** Reserved multipart form field names (not copied into session context) */
export const UPLOAD_FORM_RESERVED_KEYS = [
  "autoStart",
  "uploadSessionId",
] as const;

/**
 * Default max upload size when env is unset (200 MiB).
 * Override with PROCESSING_UPLOAD_MAX_BYTES.
 */
export const DEFAULT_UPLOAD_MAX_BYTES = 200 * 1024 * 1024;

/**
 * Env: PROCESSING_UPLOAD_BASE_DIR
 * Local disk root for multipart uploads.
 * Path shape: {base}/{uploadSessionId}/{sourceId}-{id}.{ext}
 */
export const PROCESSING_UPLOAD_BASE_DIR_ENV =
  "PROCESSING_UPLOAD_BASE_DIR" as const;

export const PROCESSING_UPLOAD_MAX_BYTES_ENV =
  "PROCESSING_UPLOAD_MAX_BYTES" as const;

/**
 * S3/COS direct upload: pending state TTL between initiate and complete.
 * Align with presigned URL or STS credential lifetime.
 */
export const DEFAULT_PENDING_UPLOAD_TTL_SECONDS = 60 * 60 * 24;
