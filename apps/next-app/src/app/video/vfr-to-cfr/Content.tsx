"use client";

import { useEffect, useRef, useState } from "react";
import { ImportJobProgressPanel } from "@/app/files/import-sales-test-fixtures/ImportJobProgressPanel";
import {
  describeUploadProgress,
  type ImportJobProgressDisplay,
  uploadOnlyProgressDisplay,
  waitForProcessingJobViaSse,
} from "@/app/files/import-sales-test-fixtures/processing-job-sse";
import {
  DEFAULT_VFR_TO_CFR_MAX_UPLOAD_BYTES,
  downloadConvertedVideo,
  fetchVfrToCfrTemplateInfo,
  formatVideoFileSize,
  getProcessingJob,
  type ProcessingJobResponse,
  readAxiosErrorMessage,
  startVfrToCfrProcessing,
  uploadVfrVideo,
  VFR_TO_CFR_JOB_WAIT_TIMEOUT_MS,
} from "./api";

function formatJobSummary(job: ProcessingJobResponse): string {
  const parts = [
    `Job ${job.jobId}`,
    `phase=${job.phase}`,
    job.outcome ? `outcome=${job.outcome}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export const Content = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | undefined>();
  const [maxUploadBytes, setMaxUploadBytes] = useState(
    DEFAULT_VFR_TO_CFR_MAX_UPLOAD_BYTES,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [progressDisplay, setProgressDisplay] =
    useState<ImportJobProgressDisplay | null>(null);
  const [lastJob, setLastJob] = useState<ProcessingJobResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchVfrToCfrTemplateInfo()
      .then((info) => {
        if (info.maxUploadBytes > 0) {
          setMaxUploadBytes(info.maxUploadBytes);
        }
      })
      .catch(() => {
        // Keep client default when Nest is unreachable.
      });
  }, []);

  const handleConvert = async () => {
    if (!selectedFile) {
      return;
    }

    if (selectedFile.size > maxUploadBytes) {
      setErrorMessage(
        `File is ${formatVideoFileSize(selectedFile.size)}; max upload is ${formatVideoFileSize(maxUploadBytes)}.`,
      );
      return;
    }

    setIsRunning(true);
    setErrorMessage(null);
    setLastJob(null);
    setProgressDisplay(null);

    try {
      setProgressDisplay(
        uploadOnlyProgressDisplay({
          detail: "Preparing upload…",
          percent: 0,
        }),
      );

      const { uploadSessionId } = await uploadVfrVideo(selectedFile, {
        onUploadProgress: ({ loaded, total }) => {
          setProgressDisplay(
            uploadOnlyProgressDisplay(describeUploadProgress(loaded, total)),
          );
        },
      });

      const { jobId } = await startVfrToCfrProcessing(uploadSessionId);
      const initialJob = await getProcessingJob(jobId);

      const snapshot = await waitForProcessingJobViaSse(
        jobId,
        process.env.NEXT_PUBLIC_NESTJS,
        {
          initialSnapshot: initialJob,
          onDisplayChange: setProgressDisplay,
          timeoutMs: VFR_TO_CFR_JOB_WAIT_TIMEOUT_MS,
        },
      );

      const job = await getProcessingJob(jobId);
      setLastJob(job);

      if (snapshot.phase === "failed" || job.outcome !== "success") {
        setErrorMessage(
          `Conversion failed (phase=${job.phase}, outcome=${job.outcome ?? "n/a"})`,
        );
      }
    } catch (error) {
      console.error("VFR→CFR conversion failed:", error);
      setErrorMessage(readAxiosErrorMessage(error));
      setProgressDisplay(null);
    } finally {
      setIsRunning(false);
    }
  };

  const canDownload =
    lastJob?.phase === "complete" && lastJob.outcome === "success";

  const fileTooLarge =
    selectedFile != null && selectedFile.size > maxUploadBytes;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="font-semibold text-2xl text-gray-900">
        VFR → CFR (mp4 demo)
      </h1>
      <p className="mt-2 text-gray-600 text-sm">
        Upload a variable-frame-rate MP4 (up to{" "}
        {formatVideoFileSize(maxUploadBytes)}). Nest queues a BullMQ job and
        shells out to system{" "}
        <code className="rounded bg-gray-100 px-1">ffmpeg</code> to re-encode at
        constant 30 fps. Large uploads and encodes may take hours.
      </p>

      <div className="mt-6 space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,.mp4"
          className="sr-only"
          disabled={isRunning}
          onChange={(event) => {
            setSelectedFile(event.target.files?.[0]);
            setErrorMessage(null);
            setLastJob(null);
          }}
        />

        <button
          type="button"
          disabled={isRunning}
          onClick={() => fileInputRef.current?.click()}
          className={`group flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            selectedFile
              ? fileTooLarge
                ? "border-red-300 bg-red-50/60"
                : "border-blue-300 bg-blue-50/60 hover:border-blue-400 hover:bg-blue-50"
              : "border-gray-300 bg-gray-50/80 hover:border-blue-400 hover:bg-blue-50/50"
          }`}
        >
          <span
            className={`inline-flex items-center rounded-md px-4 py-2 font-medium text-sm shadow-sm transition-colors ${
              selectedFile
                ? "bg-white text-blue-700 ring-1 ring-blue-200 group-hover:bg-blue-600 group-hover:text-white group-hover:ring-blue-600"
                : "bg-blue-600 text-white group-hover:bg-blue-700"
            }`}
          >
            {selectedFile ? "Change MP4" : "Choose MP4"}
          </span>
          {selectedFile ? (
            <span className="max-w-full truncate font-medium text-gray-800 text-sm">
              {selectedFile.name}
              <span
                className={`ml-2 font-normal ${fileTooLarge ? "text-red-600" : "text-gray-500"}`}
              >
                ({formatVideoFileSize(selectedFile.size)})
              </span>
            </span>
          ) : (
            <span className="text-gray-500 text-sm">
              Click to browse · <code className="text-xs">.mp4</code> only
            </span>
          )}
        </button>

        {fileTooLarge ? (
          <p className="text-red-600 text-sm">
            File exceeds the {formatVideoFileSize(maxUploadBytes)} upload limit.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedFile || isRunning || fileTooLarge}
            onClick={() => void handleConvert()}
          >
            {isRunning ? "Converting…" : "Upload & convert"}
          </button>

          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canDownload || isRunning}
            onClick={() => {
              if (!lastJob) {
                return;
              }
              downloadConvertedVideo(lastJob.jobId);
            }}
          >
            Download CFR mp4
          </button>
        </div>
      </div>

      <ImportJobProgressPanel display={progressDisplay} isLive={isRunning} />

      {lastJob ? (
        <p className="mt-4 font-mono text-gray-700 text-sm">
          {formatJobSummary(lastJob)}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 whitespace-pre-wrap text-red-600 text-sm">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};
