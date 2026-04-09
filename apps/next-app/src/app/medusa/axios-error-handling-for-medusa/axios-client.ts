import type { HttpErrorData } from "@repo/types";
import axios, {
  type AxiosError,
  AxiosHeaders,
  type AxiosResponse,
} from "axios";
import { useAuthStore } from "@/stores/auth";

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  withCredentials: true,
});

instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<HttpErrorData>) => {
    const status = error.response?.status;
    const errorData = error.response?.data;
    const errorCode = errorData?.code;

    if (
      error.response?.headers["content-type"] === "text/html; charset=utf-8"
    ) {
      return Promise.reject({
        code: "SYSTEM.ENDPOINT_NOT_FOUND",
        message: `The requested endpoint ${error.config?.url} was not found on the server.`,
        details: {},
        timestamp: errorData?.timestamp,
      });
    }

    if (status === 401) {
      const { signOut } = useAuthStore.getState();
      signOut();

      return Promise.reject({
        code: errorCode || "AUTH.UNAUTHORIZED",
        message: errorData?.message,
        details: {},
        timestamp: errorData?.timestamp,
      });
    }

    if (errorData) {
      return Promise.reject({
        code: errorData.code,
        message: errorData.message,
        details: errorData.details,
        timestamp: errorData.timestamp,
      });
    }

    return Promise.reject({
      code: "SYSTEM.UNKNOWN_ERROR",
      message:
        error.response?.status === 500
          ? "Something went wrong on the server"
          : error.message || "Network Error",
      details: {},
      timestamp: new Date().toISOString(),
    });
  },
);

async function get<T>(
  url: string,
  options?: {
    params?: any;
    withoutApiKey?: boolean;
    apiKey?: string;
  },
): Promise<T> {
  const res = await request<T>("GET", url, options);
  return res.data;
}

async function post<T>(
  url: string,
  data?: any,
  options?: {
    withoutApiKey?: boolean;
    apiKey?: string;
    headers?: AxiosHeaders;
  },
): Promise<T> {
  const res = await request<T>("POST", url, {
    data,
    withoutApiKey: options?.withoutApiKey,
    apiKey: options?.apiKey,
    headers: options?.headers,
  });
  return res.data;
}

async function del<T>(
  url: string,
  data?: any,
  options?: {
    withoutApiKey?: boolean;
    apiKey?: string;
  },
): Promise<T> {
  const res = await request<T>("DELETE", url, {
    data,
    withoutApiKey: options?.withoutApiKey,
    apiKey: options?.apiKey,
  });
  return res.data;
}

async function patch<T>(
  url: string,
  data?: any,
  options?: {
    withoutApiKey?: boolean;
    apiKey?: string;
    headers?: AxiosHeaders;
  },
): Promise<T> {
  const res = await request<T>("PATCH", url, {
    data,
    withoutApiKey: options?.withoutApiKey,
    apiKey: options?.apiKey,
    headers: options?.headers,
  });
  return res.data;
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  options?: {
    data?: any;
    params?: any;
    withoutApiKey?: boolean;
    apiKey?: string;
    headers?: AxiosHeaders;
  },
): Promise<AxiosResponse<T>> {
  const headers = new AxiosHeaders();
  headers.set("Content-Type", "application/json");
  options?.withoutApiKey ||
    headers.set(
      "x-publishable-api-key",
      options?.apiKey || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
    );
  return await instance.request<T>({
    method,
    url,
    ...options,
    headers: options?.headers ? options.headers.concat(headers) : headers,
  });
}

const http = { get, post, patch, del, request };
export default http;
