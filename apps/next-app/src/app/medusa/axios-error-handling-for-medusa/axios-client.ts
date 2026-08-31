/**
 * Pre-configured HTTP client for the Medusa demo.
 *
 * The original used `axios.create({...}).interceptors.response.use(...)` to
 * normalise backend errors into a `HttpErrorData` shape and to call
 * `signOut()` on 401. We preserve that contract with ky's
 * `afterResponse` hook (and `beforeRequest` for the `Content-Type` +
 * `x-publishable-api-key` default headers).
 */
import type { HttpErrorData } from "@repo/types";
import ky, { type KyInstance } from "ky";
import { useAuthStore } from "@/stores/auth";

const instance: KyInstance = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "x-publishable-api-key":
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
  },
  hooks: {
    afterResponse: [
      async (_request, _options, response) => {
        if (response.ok) return response;
        const status = response.status;
        let errorData: HttpErrorData | undefined;
        try {
          errorData = (await response.clone().json()) as HttpErrorData;
        } catch {
          // non-JSON body (e.g. the HTML 404 page)
        }

        /* `timestamp` is required on HttpErrorData; if the backend omitted
         * it, stamp the current time so we always satisfy the type. */
        const fallbackTimestamp = new Date().toISOString();

        if (response.headers.get("content-type")?.startsWith("text/html")) {
          throw {
            code: "SYSTEM.ENDPOINT_NOT_FOUND",
            message: `The requested endpoint ${response.url} was not found on the server.`,
            details: {},
            timestamp: errorData?.timestamp ?? fallbackTimestamp,
          } satisfies HttpErrorData;
        }

        if (status === 401) {
          const { signOut } = useAuthStore.getState();
          signOut();

          throw {
            code: errorData?.code ?? "AUTH.UNAUTHORIZED",
            message: errorData?.message,
            details: {},
            timestamp: errorData?.timestamp ?? fallbackTimestamp,
          } satisfies HttpErrorData;
        }

        if (errorData) {
          throw {
            code: errorData.code,
            message: errorData.message,
            details: errorData.details,
            timestamp: errorData.timestamp,
          } satisfies HttpErrorData;
        }

        throw {
          code: "SYSTEM.UNKNOWN_ERROR",
          message:
            status === 500
              ? "Something went wrong on the server"
              : "Network Error",
          details: {},
          timestamp: fallbackTimestamp,
        } satisfies HttpErrorData;
      },
    ],
  },
});

export type RequestOptions = {
  params?: Record<string, unknown>;
  withoutApiKey?: boolean;
  apiKey?: string;
  headers?: Record<string, string>;
};

async function get<T>(url: string, options?: RequestOptions): Promise<T> {
  const headers = buildHeaders(options);
  return instance.get(buildUrl(url, options?.params), { headers }).json<T>();
}

async function post<T>(
  url: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const headers = buildHeaders(options);
  return instance
    .post(buildUrl(url, options?.params), {
      headers,
      json: data,
    })
    .json<T>();
}

async function del<T>(
  url: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const headers = buildHeaders(options);
  return instance
    .delete(buildUrl(url, options?.params), {
      headers,
      json: data,
    })
    .json<T>();
}

async function patch<T>(
  url: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const headers = buildHeaders(options);
  return instance
    .patch(buildUrl(url, options?.params), {
      headers,
      json: data,
    })
    .json<T>();
}

function buildUrl(url: string, params?: Record<string, unknown>): string {
  if (!params) return url;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  if (!qs) return url;
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}

function buildHeaders(options?: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!options?.withoutApiKey) {
    headers["x-publishable-api-key"] =
      options?.apiKey ?? process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";
  }
  return { ...headers, ...options?.headers };
}

const http = { get, post, patch, del };
export default http;
