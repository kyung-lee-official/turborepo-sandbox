/**
 * Thin wrapper around Bun's native `fetch` to make axios-style calls ergonomic.
 *
 * Behaviour notes:
 *  - `body: object` is JSON.stringified and `Content-Type: application/json` is
 *    set automatically (axios did the same).
 *  - `body: FormData` / `Blob` / `ArrayBuffer` is sent as-is and the
 *    `Content-Type` header is left to the runtime (axios did the same).
 *  - `params` is serialised with `URLSearchParams`. Pass a `Record` of
 *    primitives; `null` / `undefined` values are dropped, matching axios.
 *  - Non-2xx responses throw a `FetcherError` with status + parsed body so
 *    callers can read `err.status` / `err.data` the same way they used to
 *    inspect `axios.isAxiosError(err)`.
 *  - The response body is parsed by `Content-Type`:
 *      - `application/json` -> `await res.json()`
 *      - text / `*\/`        -> `await res.text()`
 *      - binary              -> `await res.arrayBuffer()`
 *    Set `responseType: "blob"` to force `Blob` and `"text"` to force
 *    `string`, mirroring axios.
 */
export type FetcherResponseType = "json" | "text" | "blob" | "arrayBuffer";

export type FetcherOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  baseURL?: string;
  responseType?: FetcherResponseType;
  /**
   * Abort the request after `timeout` milliseconds. Implemented via
   * `AbortSignal.timeout()` (Node 17.3+ / browsers). Pass `0` or omit
   * to disable. axios had this as `timeout: number` in ms.
   */
  timeout?: number;
};

export class FetcherError<TBody = unknown> extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly data: TBody;

  constructor(
    message: string,
    init: { status: number; statusText: string; data: TBody },
  ) {
    super(message);
    this.name = "FetcherError";
    this.status = init.status;
    this.statusText = init.statusText;
    this.data = init.data;
  }
}

const isPlainObject = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  !(value instanceof FormData) &&
  !(value instanceof Blob) &&
  !(value instanceof ArrayBuffer) &&
  !(value instanceof URLSearchParams) &&
  !(value instanceof ReadableStream);

function buildUrl(
  url: string,
  params: FetcherOptions["params"],
  baseURL?: string,
): string {
  const absolute = baseURL ? new URL(url, baseURL).toString() : url;
  if (!params) return absolute;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  if (!qs) return absolute;
  return absolute.includes("?") ? `${absolute}&${qs}` : `${absolute}?${qs}`;
}

function buildBody(
  body: FetcherOptions["body"],
  headers: Headers,
): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return body;
  if (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof URLSearchParams ||
    body instanceof ReadableStream
  ) {
    // Browser/Runtime sets the right Content-Type (multipart boundary, etc.)
    headers.delete("Content-Type");
    return body as BodyInit;
  }
  if (!isPlainObject(body)) return body as BodyInit;
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return JSON.stringify(body);
}

function defaultResponseType(
  contentType: string | null,
  hinted?: FetcherResponseType,
): FetcherResponseType {
  if (hinted) return hinted;
  if (!contentType) return "text";
  if (contentType.includes("application/json")) return "json";
  if (contentType.startsWith("text/")) return "text";
  return "arrayBuffer";
}

async function readBody<T>(
  res: Response,
  type: FetcherResponseType,
): Promise<T> {
  switch (type) {
    case "json":
      return (await res.json()) as T;
    case "text":
      return (await res.text()) as unknown as T;
    case "blob":
      return (await res.blob()) as unknown as T;
    case "arrayBuffer":
      return (await res.arrayBuffer()) as unknown as T;
  }
}

export async function fetcher<T = unknown>(
  url: string,
  options: FetcherOptions = {},
): Promise<T> {
  const { body, params, baseURL, responseType, headers, timeout, ...rest } =
    options;

  const finalHeaders = new Headers(headers);
  const finalBody = buildBody(body, finalHeaders);
  const finalUrl = buildUrl(url, params, baseURL);

  /* Combine a caller-supplied `signal` with the optional `timeout` so
   * either cancels the request. axios's `timeout: number` mapped here. */
  const signals: AbortSignal[] = [];
  if (rest.signal) signals.push(rest.signal);
  if (timeout && timeout > 0) signals.push(AbortSignal.timeout(timeout));
  const combinedSignal =
    signals.length === 0
      ? undefined
      : signals.length === 1
        ? signals[0]
        : AbortSignal.any(signals);

  const res = await fetch(finalUrl, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
    ...(combinedSignal ? { signal: combinedSignal } : {}),
  });

  const contentType = res.headers.get("content-type");
  const resolvedType = defaultResponseType(contentType, responseType);

  if (!res.ok) {
    const errorData = await readBody<unknown>(res, resolvedType).catch(
      () => undefined,
    );
    throw new FetcherError(`Request failed: ${res.status} ${res.statusText}`, {
      status: res.status,
      statusText: res.statusText,
      data: errorData,
    });
  }

  return readBody<T>(res, resolvedType);
}

export const get = <T = unknown>(url: string, options?: FetcherOptions) =>
  fetcher<T>(url, { ...options, method: "GET" });

export const post = <T = unknown>(
  url: string,
  body?: unknown,
  options?: FetcherOptions,
) => fetcher<T>(url, { ...options, method: "POST", body });

export const put = <T = unknown>(
  url: string,
  body?: unknown,
  options?: FetcherOptions,
) => fetcher<T>(url, { ...options, method: "PUT", body });

export const del = <T = unknown>(url: string, options?: FetcherOptions) =>
  fetcher<T>(url, { ...options, method: "DELETE" });

export const patch = <T = unknown>(
  url: string,
  body?: unknown,
  options?: FetcherOptions,
) => fetcher<T>(url, { ...options, method: "PATCH", body });
