/**
 * Pre-configured HTTP client for the secure (HTTP-only cookie) demo.
 *
 * Replaces the previous `axios.create({ baseURL: "/api", withCredentials: true })`
 * with a thin wrapper around `@/lib/fetcher` that pre-sets `baseURL` to
 * `/api` and `credentials: "include"` (so the browser sends the HTTP-only
 * cookie back on every request automatically, same as `withCredentials`).
 */
import { type FetcherOptions, fetcher } from "@/lib/fetcher";

const BASE = "/api";

function withDefaults(options?: FetcherOptions): FetcherOptions {
  return {
    ...options,
    baseURL: options?.baseURL ?? BASE,
    credentials: options?.credentials ?? "include",
  };
}

export const secureApi = {
  async get<T = unknown>(url: string, options?: FetcherOptions): Promise<T> {
    return fetcher<T>(url, { ...withDefaults(options), method: "GET" });
  },
  async post<T = unknown>(
    url: string,
    body?: unknown,
    options?: FetcherOptions,
  ): Promise<T> {
    return fetcher<T>(url, {
      ...withDefaults(options),
      method: "POST",
      body,
    });
  },
  async put<T = unknown>(
    url: string,
    body?: unknown,
    options?: FetcherOptions,
  ): Promise<T> {
    return fetcher<T>(url, {
      ...withDefaults(options),
      method: "PUT",
      body,
    });
  },
  async patch<T = unknown>(
    url: string,
    body?: unknown,
    options?: FetcherOptions,
  ): Promise<T> {
    return fetcher<T>(url, {
      ...withDefaults(options),
      method: "PATCH",
      body,
    });
  },
  async del<T = unknown>(url: string, options?: FetcherOptions): Promise<T> {
    return fetcher<T>(url, { ...withDefaults(options), method: "DELETE" });
  },
};
