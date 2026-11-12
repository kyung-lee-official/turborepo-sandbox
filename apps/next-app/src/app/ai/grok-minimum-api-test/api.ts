import { post } from "@/lib/fetcher";
import type {
  GrokMinimumApiTestInput,
  GrokMinimumApiTestResult,
} from "./types";

export const GROK_MINIMUM_API_TEST_ENDPOINT = "/api/ai/grok-minimum-api-test";

export const runGrokMinimumApiTest = (input: GrokMinimumApiTestInput) =>
  post<GrokMinimumApiTestResult>(GROK_MINIMUM_API_TEST_ENDPOINT, input);
