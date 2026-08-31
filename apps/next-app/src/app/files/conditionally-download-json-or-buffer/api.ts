import { elysiaBaseUrl } from "@/lib/api-base-url";
import { get } from "@/lib/fetcher";

const apiBaseUrl = elysiaBaseUrl();

export const conditionallyDownloadJsonOrBuffer = async () => {
  // Crucial: use arrayBuffer responseType so we can handle both JSON and
  // binary data responses from the same endpoint.
  return get<ArrayBuffer>("/techniques/conditionally-download-json-or-buffer", {
    baseURL: apiBaseUrl,
    responseType: "arrayBuffer",
  });
};
