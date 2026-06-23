"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProcessingJobResponse } from "../import-sales-test-fixtures/api";
import { SalesDataNav } from "../sales-data/SalesDataNav";
import {
  ACTIVE_JOB_PHASES,
  HISTORY_JOB_PHASES,
  listProcessingJobs,
} from "./api";

type JobTab = "active" | "history";

const ACTIVE_POLL_MS = 3000;

function formatWhen(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleString();
}

function phaseBadgeClass(phase: ProcessingJobResponse["phase"]): string {
  switch (phase) {
    case "queued":
      return "bg-gray-100 text-gray-800";
    case "processing":
      return "bg-blue-100 text-blue-800";
    case "complete":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function ProcessingJobsList() {
  const [tab, setTab] = useState<JobTab>("active");
  const [jobs, setJobs] = useState<ProcessingJobResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const phaseFilter = tab === "active" ? ACTIVE_JOB_PHASES : HISTORY_JOB_PHASES;

  const loadJobs = useCallback(
    async (options?: { cursor?: string; append?: boolean }) => {
      const append = options?.append ?? false;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const result = await listProcessingJobs({
          phase: phaseFilter,
          limit: tab === "active" ? 20 : 20,
          cursor: options?.cursor,
        });

        setJobs((prev) => (append ? [...prev, ...result.jobs] : result.jobs));
        setNextCursor(result.nextCursor);
      } catch (error) {
        console.error("Failed to load processing jobs:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load processing jobs",
        );
        if (!append) {
          setJobs([]);
          setNextCursor(null);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [phaseFilter, tab],
  );

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (tab !== "active") {
      return;
    }

    const intervalId = setInterval(() => {
      void loadJobs();
    }, ACTIVE_POLL_MS);

    return () => clearInterval(intervalId);
  }, [tab, loadJobs]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <SalesDataNav current="jobs" />

      <div className="mb-6">
        <h1 className="mb-2 font-bold text-3xl">Processing jobs</h1>
        <p className="text-gray-600">
          Async import jobs from <code className="text-sm">GET /jobs</code> with
          phase filters.
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`rounded-lg px-4 py-2 font-medium text-sm ${
            tab === "active"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`rounded-lg px-4 py-2 font-medium text-sm ${
            tab === "history"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          History
        </button>
      </div>

      {tab === "active" ? (
        <p className="mb-4 text-gray-500 text-sm">
          Refreshes every {ACTIVE_POLL_MS / 1000}s while this tab is open.
        </p>
      ) : null}

      {errorMessage ? (
        <div className="mb-4 border-red-400 border-l-4 bg-red-50 p-4 text-red-900 text-sm">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Job
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Domain
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Phase
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Outcome
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">
                Processed
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">
                Errors
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Loading jobs…
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No {tab === "active" ? "active" : "historical"} jobs found.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.jobId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{job.jobId}</td>
                  <td className="px-4 py-3">{job.domainKind}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium text-xs ${phaseBadgeClass(job.phase)}`}
                    >
                      {job.phase}
                    </span>
                  </td>
                  <td className="px-4 py-3">{job.outcome ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {job.processedCount?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {job.errorCount?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-4 py-3">{formatWhen(job.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {tab === "history" && nextCursor ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={isLoadingMore}
            onClick={() => void loadJobs({ cursor: nextCursor, append: true })}
            className="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-800 text-sm hover:bg-gray-200 disabled:opacity-50"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
