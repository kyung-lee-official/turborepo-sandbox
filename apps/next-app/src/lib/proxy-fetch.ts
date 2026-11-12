type BunProxyFetchInit = RequestInit & { proxy: string };

/**
 * Bun's `fetch` accepts a per-request `proxy` option. Returns `undefined` when
 * no proxy URL is supplied, so the provider falls back to the global `fetch`.
 *
 * The Next.js app always runs under Bun (`bun --bun next ...`), so the proxy
 * option is available in both dev and production.
 */
export function createProxyFetch(
  proxyUrl: string | undefined,
): typeof fetch | undefined {
  const trimmedProxyUrl = proxyUrl?.trim();

  if (!trimmedProxyUrl) {
    return undefined;
  }

  return (input, init) =>
    fetch(input, {
      ...init,
      proxy: trimmedProxyUrl,
    } as BunProxyFetchInit);
}
