/**
 * Returns the configured Elysia API base URL.
 *
 * Throws if `NEXT_PUBLIC_ELYSIA` is not set. Fails fast at module load instead
 * of silently falling back to a wrong URL — every consumer depends on this
 * being correct, so a missing config is a hard error, not a recoverable one.
 */
export function elysiaBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_ELYSIA;
  if (!url) {
    throw new Error("NEXT_PUBLIC_ELYSIA is not configured");
  }
  return url;
}
