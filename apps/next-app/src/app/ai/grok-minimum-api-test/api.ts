import { FetcherError, post } from "@/lib/fetcher";
import type {
  GrokMinimumApiTestInput,
  GrokMinimumApiTestResult,
} from "./types";

export const GROK_MINIMUM_API_TEST_ENDPOINT = "/api/ai/grok-minimum-api-test";

export const runGrokMinimumApiTest = (input: GrokMinimumApiTestInput) =>
  post<GrokMinimumApiTestResult>(GROK_MINIMUM_API_TEST_ENDPOINT, input);

export function getGrokMinimumApiTestErrorMessage(error: unknown): string {
  if (error instanceof FetcherError) {
    const data = error.data;
    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
    ) {
      return data.error;
    }
  }

  return error instanceof Error ? error.message : "Unknown error";
}
