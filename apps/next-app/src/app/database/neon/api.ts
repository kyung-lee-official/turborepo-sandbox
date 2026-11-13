import { post } from "@/lib/fetcher";
import type { NeonRandomNumberInput, NeonRandomNumberResult } from "./types";

export const NEON_RANDOM_NUMBER_ENDPOINT = "/api/database/neon";

export const writeNeonRandomNumber = (input: NeonRandomNumberInput) =>
  post<NeonRandomNumberResult>(NEON_RANDOM_NUMBER_ENDPOINT, input);
