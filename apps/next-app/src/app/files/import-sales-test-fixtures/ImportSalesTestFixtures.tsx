"use client";

import { useRef, useState } from "react";
import { SalesImportFixturesNav } from "../sales-import-fixtures/SalesImportFixturesNav";
import {
  fetchProcessingErrors,
  getProcessingJob,
  type ProcessingJobResponse,
  startSalesImportProcessing,
  triggerValidationErrorDownload,
  uploadSalesImportFiles,
} from "./api";
import { ImportJobProgressPanel } from "./ImportJobProgressPanel";
import {
  appendProgressLine,
  type ProgressLine,
  waitForProcessingJobViaSse,
} from "./processing-job-sse";

type UploadSlot = {
  sourceId: "salesData" | "inventory" | "productDescriptions";
  label: string;
  accept: string;
  hint: string;
};

const UPLOAD_SLOTS: UploadSlot[] = [
  {
    sourceId: "salesData",
    label: "salesData.xlsx",
    accept:
      ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    hint: "Products + LineItems worksheets",
  },
  {
    sourceId: "inventory",
    label: "inventory.xlsx",
    accept:
      ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    hint: "Inventory worksheet (SKU, Inventory Qty)",
  },
  {
    sourceId: "productDescriptions",
    label: "productDescriptions.jsonl",
    accept: ".jsonl,application/x-ndjson,application/json",
    hint: "One JSON object per line (sku, description)",
  },
];

function formatJobSummary(job: ProcessingJobResponse): string {
  const parts = [
    `Job ${job.jobId}`,
    `phase=${job.phase}`,
    job.outcome ? `outcome=${job.outcome}` : null,
    job.processedCount != null
      ? `processed=${job.processedCount.toLocaleString()}`
      : null,
    job.errorCount != null ? `errors=${job.errorCount.toLocaleString()}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export const ImportSalesTestFixtures = () => {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [selectedFiles, setSelectedFiles] = useState<
    Record<string, File | undefined>
  >({});
  const [isRunning, setIsRunning] = useState(false);
  const [progressLines, setProgressLines] = useState<ProgressLine[]>([]);
  const [lastJob, setLastJob] = useState<ProcessingJobResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloadingErrors, setIsDownloadingErrors] = useState(false);

  const allSelected = UPLOAD_SLOTS.every(
    (slot) => selectedFiles[slot.sourceId],
  );

  const handleFileChange = (sourceId: string, file: File | undefined) => {
    setSelectedFiles((prev) => ({ ...prev, [sourceId]: file }));
    setErrorMessage(null);
  };

  const handleUpload = async () => {
    const salesData = selectedFiles.salesData;
    const inventory = selectedFiles.inventory;
    const productDescriptions = selectedFiles.productDescriptions;

    if (!salesData || !inventory || !productDescriptions) {
      return;
    }

    setIsRunning(true);
    setErrorMessage(null);
    setLastJob(null);
    setProgressLines([]);

    const pushProgress = (label: string, detail?: string) => {
      setProgressLines((prev) => appendProgressLine(prev, label, detail));
    };

    try {
      pushProgress("Uploading files");
      const { uploadSessionId } = await uploadSalesImportFiles({
        salesData,
        inventory,
        productDescriptions,
      });
      pushProgress("Upload complete", uploadSessionId);

      pushProgress("Starting processing job");
      const { jobId } = await startSalesImportProcessing(uploadSessionId);
      pushProgress("Job accepted", jobId);

      await waitForProcessingJobViaSse(jobId, process.env.NEXT_PUBLIC_NESTJS, {
        onProgressLine: (line) => {
          setProgressLines((prev) => {
            const last = prev.at(-1);
            if (
              last &&
              last.label === line.label &&
              last.detail === line.detail
            ) {
              return prev;
            }
            return [...prev, line];
          });
        },
      });

      const job = await getProcessingJob(jobId);
      setLastJob(job);
    } catch (error) {
      console.error("Sales import failed:", error);
      const message =
        error instanceof Error ? error.message : "Sales import failed";
      setErrorMessage(message);
      pushProgress("Import failed", message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownloadErrors = async () => {
    if (!lastJob?.hasErrors) {
      return;
    }

    setIsDownloadingErrors(true);
    setErrorMessage(null);

    try {
      const report = await fetchProcessingErrors(lastJob.jobId);
      triggerValidationErrorDownload(lastJob.jobId, report);
    } catch (error) {
      console.error("Failed to download validation errors:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to download validation errors",
      );
    } finally {
      setIsDownloadingErrors(false);
    }
  };

  const showErrorDownload =
    lastJob?.outcome === "validation_failed" && lastJob.hasErrors;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 font-bold text-3xl">Import Sales Test Fixtures</h1>
      <p className="mb-4 text-gray-600">
        Upload the three sources for{" "}
        <code className="text-sm">sales-report</code> async import. LineItems
        rows merge with Products, inventory, and JSONL by SKU.
      </p>

      <SalesImportFixturesNav current="import" />

      <div className="mb-6 space-y-4">
        {UPLOAD_SLOTS.map((slot) => {
          const selected = selectedFiles[slot.sourceId];
          return (
            <div
              key={slot.sourceId}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold text-lg">
                  {slot.label}
                  <span className="ml-2 font-normal text-gray-500 text-sm">
                    field <code>{slot.sourceId}</code>
                  </span>
                </h2>
                {selected ? (
                  <span className="text-green-700 text-sm">
                    {selected.name}
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">
                    No file selected
                  </span>
                )}
              </div>
              <p className="mb-3 text-gray-600 text-sm">{slot.hint}</p>
              <input
                ref={(el) => {
                  fileInputRefs.current[slot.sourceId] = el;
                }}
                type="file"
                accept={slot.accept}
                disabled={isRunning}
                className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                onChange={(event) => {
                  handleFileChange(
                    slot.sourceId,
                    event.target.files?.[0] ?? undefined,
                  );
                }}
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleUpload}
        disabled={!allSelected || isRunning}
        className={`rounded-lg px-6 py-3 font-medium ${
          allSelected && !isRunning
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "cursor-not-allowed bg-gray-300 text-gray-500"
        } transition-colors`}
      >
        {isRunning ? "Running import…" : "Upload and start import"}
      </button>

      <ImportJobProgressPanel lines={progressLines} isLive={isRunning} />

      {lastJob ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-800 text-sm">
          <p className="font-medium">Last job</p>
          <p className="mt-1 font-mono text-xs">{formatJobSummary(lastJob)}</p>
          {showErrorDownload ? (
            <div className="mt-3 space-y-2">
              <p className="text-amber-800">
                Validation errors were saved to the database. Download the JSON
                report to review them.
              </p>
              <button
                type="button"
                onClick={handleDownloadErrors}
                disabled={isDownloadingErrors}
                className="rounded-md bg-amber-600 px-4 py-2 font-medium text-sm text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloadingErrors
                  ? "Preparing download…"
                  : "Download validation errors (JSON)"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 border-red-400 border-l-4 bg-red-50 p-4 text-red-900 text-sm">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
};
