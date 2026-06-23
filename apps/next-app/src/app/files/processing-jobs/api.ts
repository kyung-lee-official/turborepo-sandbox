import axios from "axios";
import type { ProcessingJobResponse } from "../import-sales-test-fixtures/api";

export type ListProcessingJobsParams = {
  phase?: string;
  domainKind?: string;
  limit?: number;
  cursor?: string;
};

export type ListProcessingJobsResponse = {
  jobs: ProcessingJobResponse[];
  nextCursor: string | null;
};

const nestBaseUrl = process.env.NEXT_PUBLIC_NESTJS;

export const ACTIVE_JOB_PHASES = "queued,processing" as const;
export const HISTORY_JOB_PHASES = "complete,failed" as const;

export async function listProcessingJobs(
  params: ListProcessingJobsParams = {},
): Promise<ListProcessingJobsResponse> {
  const res = await axios.get<ListProcessingJobsResponse>("/jobs", {
    baseURL: nestBaseUrl,
    params,
  });
  return res.data;
}
