/**
 * Appendix C — Redis key namespace and channel patterns (cross-layer).
 */

/** Prefix for all async-processing Redis keys and pub/sub channels */
export const ASYNC_PROCESSING_REDIS_NAMESPACE = "async-processing" as const;

export function activeJobLockKey(domainKind: string): string {
  return `${ASYNC_PROCESSING_REDIS_NAMESPACE}:active:${domainKind}`;
}

export function progressChannel(jobId: string): string {
  return `${ASYNC_PROCESSING_REDIS_NAMESPACE}:progress:${jobId}`;
}

export function terminalChannel(jobId: string): string {
  return `${ASYNC_PROCESSING_REDIS_NAMESPACE}:terminal:${jobId}`;
}

export function uploadSessionKey(uploadSessionId: string): string {
  return `${ASYNC_PROCESSING_REDIS_NAMESPACE}:upload-session:${uploadSessionId}`;
}
