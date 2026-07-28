"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImportJobProgressPanel } from "@/app/files/import-sales-test-fixtures/ImportJobProgressPanel";
import {
  describeUploadProgress,
  type ImportJobProgressDisplay,
  uploadOnlyProgressDisplay,
  waitForProcessingJobViaSse,
} from "@/app/files/import-sales-test-fixtures/processing-job-sse";
import {
  convertUploadedVideo,
  DEFAULT_VFR_TO_CFR_MAX_UPLOAD_BYTES,
  DEFAULT_VFR_TO_CFR_TARGET_FPS_PRESETS,
  deleteOutputVideo,
  deleteUploadedVideo,
  downloadOutputVideo,
  fetchVfrToCfrTemplateInfo,
  formatDate,
  formatDuration,
  formatTargetFps,
  formatVideoFileSize,
  getOutputVideoDetail,
  getProcessingJob,
  getUploadedVideoDetail,
  listOutputVideos,
  listUploadedVideos,
  readAxiosErrorMessage,
  uploadVideoFile,
  VFR_TO_CFR_JOB_WAIT_TIMEOUT_MS,
  type VideoDetail,
  type VideoListItem,
} from "./api";

type Selection = {
  kind: "uploaded" | "output";
  id: string;
};

function VideoRow({
  item,
  selected,
  onSelect,
  onDelete,
}: {
  item: VideoListItem;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
        selected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onSelect}
      >
        <p className="truncate font-medium text-gray-900 text-sm">
          {item.label}
        </p>
        <p className="mt-0.5 text-gray-500 text-xs">
          {formatVideoFileSize(item.sizeBytes)} ·{" "}
          {formatDuration(item.durationSeconds)}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-gray-400">
          {item.sha256.slice(0, 12)}…
        </p>
      </button>
      <button
        type="button"
        className="shrink-0 rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        Delete
      </button>
    </li>
  );
}

export const Content = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploaded, setUploaded] = useState<VideoListItem[]>([]);
  const [output, setOutput] = useState<VideoListItem[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [maxUploadBytes, setMaxUploadBytes] = useState(
    DEFAULT_VFR_TO_CFR_MAX_UPLOAD_BYTES,
  );
  const [targetFpsPresets, setTargetFpsPresets] = useState<number[]>([
    ...DEFAULT_VFR_TO_CFR_TARGET_FPS_PRESETS,
  ]);
  const [matchSourceAverage, setMatchSourceAverage] = useState(true);
  const [targetFps, setTargetFps] = useState(59.94);
  const [pendingUploadFile, setPendingUploadFile] = useState<
    File | undefined
  >();
  const [isUploading, setIsUploading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progressDisplay, setProgressDisplay] =
    useState<ImportJobProgressDisplay | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshLists = useCallback(async () => {
    const [uploadedItems, outputItems] = await Promise.all([
      listUploadedVideos(),
      listOutputVideos(),
    ]);
    setUploaded(uploadedItems);
    setOutput(outputItems);
  }, []);

  const loadDetail = useCallback(async (next: Selection) => {
    const data =
      next.kind === "uploaded"
        ? await getUploadedVideoDetail(next.id)
        : await getOutputVideoDetail(next.id);
    setDetail(data);
  }, []);

  useEffect(() => {
    void fetchVfrToCfrTemplateInfo()
      .then((info) => {
        if (info.maxUploadBytes > 0) {
          setMaxUploadBytes(info.maxUploadBytes);
        }
        if (info.targetFpsPresets.length > 0) {
          setTargetFpsPresets(info.targetFpsPresets);
        }
      })
      .catch(() => undefined);

    void refreshLists().catch((error) => {
      setErrorMessage(readAxiosErrorMessage(error));
    });
  }, [refreshLists]);

  useEffect(() => {
    if (!selection) {
      setDetail(null);
      return;
    }
    void loadDetail(selection).catch((error) => {
      setErrorMessage(readAxiosErrorMessage(error));
      setDetail(null);
    });
  }, [selection, loadDetail]);

  const selectedUploadId = selection?.kind === "uploaded" ? selection.id : null;
  const detailId = detail?.id ?? null;
  const suggestedTargetFps = detail?.suggestedTargetFps ?? null;

  useEffect(() => {
    if (selectedUploadId == null || detailId !== selectedUploadId) {
      return;
    }
    setMatchSourceAverage(true);
    if (suggestedTargetFps != null) {
      setTargetFps(suggestedTargetFps);
    }
  }, [selectedUploadId, detailId, suggestedTargetFps]);

  const handleUpload = async () => {
    if (!pendingUploadFile) {
      return;
    }

    if (pendingUploadFile.size > maxUploadBytes) {
      setErrorMessage(
        `File is ${formatVideoFileSize(pendingUploadFile.size)}; max upload is ${formatVideoFileSize(maxUploadBytes)}.`,
      );
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setProgressDisplay(
      uploadOnlyProgressDisplay({ detail: "Uploading…", percent: 0 }),
    );

    try {
      const result = await uploadVideoFile(pendingUploadFile, {
        onUploadProgress: ({ loaded, total }) => {
          setProgressDisplay(
            uploadOnlyProgressDisplay(describeUploadProgress(loaded, total)),
          );
        },
      });
      await refreshLists();
      setSelection({ kind: "uploaded", id: result.id });
      setPendingUploadFile(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setErrorMessage(readAxiosErrorMessage(error));
    } finally {
      setIsUploading(false);
      setProgressDisplay(null);
    }
  };

  const handleConvert = async () => {
    if (selection?.kind !== "uploaded") {
      return;
    }

    setIsConverting(true);
    setErrorMessage(null);
    setProgressDisplay(null);

    try {
      const convertOptions = matchSourceAverage
        ? { matchSourceAverage: true as const }
        : { targetFps };
      const { jobId, outputId } = await convertUploadedVideo(
        selection.id,
        convertOptions,
      );
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

      await refreshLists();

      if (snapshot.phase === "complete" && snapshot.outcome === "success") {
        setSelection({ kind: "output", id: outputId });
      } else {
        setErrorMessage(
          `Conversion failed (phase=${snapshot.phase}, outcome=${snapshot.outcome ?? "n/a"})`,
        );
      }
    } catch (error) {
      setErrorMessage(readAxiosErrorMessage(error));
    } finally {
      setIsConverting(false);
      setProgressDisplay(null);
    }
  };

  const handleDeleteUploaded = async (id: string) => {
    if (!window.confirm("Delete this uploaded video?")) {
      return;
    }
    try {
      await deleteUploadedVideo(id);
      if (selection?.kind === "uploaded" && selection.id === id) {
        setSelection(null);
      }
      await refreshLists();
    } catch (error) {
      setErrorMessage(readAxiosErrorMessage(error));
    }
  };

  const handleDeleteOutput = async (id: string) => {
    if (!window.confirm("Delete this converted video?")) {
      return;
    }
    try {
      await deleteOutputVideo(id);
      if (selection?.kind === "output" && selection.id === id) {
        setSelection(null);
      }
      await refreshLists();
    } catch (error) {
      setErrorMessage(readAxiosErrorMessage(error));
    }
  };

  const isBusy = isUploading || isConverting;
  const fileTooLarge =
    pendingUploadFile != null && pendingUploadFile.size > maxUploadBytes;

  return (
    <div className="flex min-h-svh flex-col p-6">
      <header className="mb-6">
        <h1 className="font-semibold text-2xl text-gray-900">
          VFR → CFR library
        </h1>
        <p className="mt-1 text-gray-600 text-sm">
          Upload MP4 files to{" "}
          <code className="rounded bg-gray-100 px-1">
            temp/vfr-to-cfr/uploaded
          </code>
          , convert selected uploads to CFR in{" "}
          <code className="rounded bg-gray-100 px-1">…/output</code>. Each video
          has a sidecar <code className="text-xs">.md</code> with SHA-256 and
          ffprobe info.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,.mp4"
          className="sr-only"
          disabled={isBusy}
          onChange={(event) => {
            setPendingUploadFile(event.target.files?.[0]);
            setErrorMessage(null);
          }}
        />
        <button
          type="button"
          disabled={isBusy}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose MP4
        </button>
        {pendingUploadFile ? (
          <span
            className={`text-sm ${fileTooLarge ? "text-red-600" : "text-gray-700"}`}
          >
            {pendingUploadFile.name} (
            {formatVideoFileSize(pendingUploadFile.size)})
          </span>
        ) : null}
        <button
          type="button"
          disabled={!pendingUploadFile || isBusy || fileTooLarge}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={() => void handleUpload()}
        >
          {isUploading ? "Uploading…" : "Upload"}
        </button>
        <button
          type="button"
          disabled={selection?.kind !== "uploaded" || isBusy}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          onClick={() => void handleConvert()}
        >
          {isConverting ? "Converting…" : "Convert"}
        </button>
      </div>

      {selection?.kind === "uploaded" ? (
        <section className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
          <h2 className="mb-3 font-semibold text-emerald-900 text-sm">
            Conversion settings
          </h2>
          <div className="flex flex-wrap items-start gap-6">
            <div className="min-w-[200px] text-sm">
              <p className="text-gray-600">Source average frame rate</p>
              <p className="mt-1 font-medium text-gray-900">
                {detail?.avgFrameRateFps != null
                  ? `${detail.avgFrameRateFps.toFixed(3)} fps`
                  : "—"}
              </p>
              {detail?.avgFrameRate ? (
                <p className="mt-0.5 font-mono text-[10px] text-gray-500">
                  {detail.avgFrameRate}
                </p>
              ) : null}
            </div>

            <fieldset className="min-w-[220px] space-y-2 text-sm">
              <legend className="mb-1 font-medium text-gray-800">
                Target CFR frame rate
              </legend>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="targetFpsMode"
                  checked={matchSourceAverage}
                  disabled={isBusy}
                  onChange={() => setMatchSourceAverage(true)}
                />
                <span>
                  Match source average
                  {detail?.suggestedTargetFps != null
                    ? ` (${formatTargetFps(detail.suggestedTargetFps)} fps)`
                    : ""}
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="targetFpsMode"
                  checked={!matchSourceAverage}
                  disabled={isBusy}
                  onChange={() => setMatchSourceAverage(false)}
                />
                <span>Preset</span>
              </label>
            </fieldset>

            <div className="flex flex-wrap gap-2">
              {targetFpsPresets.map((preset) => {
                const active = !matchSourceAverage && targetFps === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={isBusy || matchSourceAverage}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${
                      active
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setMatchSourceAverage(false);
                      setTargetFps(preset);
                    }}
                  >
                    {formatTargetFps(preset)} fps
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_1fr_minmax(280px,360px)]">
        <section className="flex min-h-[420px] flex-col rounded-lg border border-gray-200 bg-gray-50/50 p-4">
          <h2 className="mb-3 font-semibold text-gray-800">Uploaded</h2>
          <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {uploaded.length === 0 ? (
              <li className="text-gray-500 text-sm">No uploads yet.</li>
            ) : (
              uploaded.map((item) => (
                <VideoRow
                  key={item.id}
                  item={item}
                  selected={
                    selection?.kind === "uploaded" && selection.id === item.id
                  }
                  onSelect={() =>
                    setSelection({ kind: "uploaded", id: item.id })
                  }
                  onDelete={() => void handleDeleteUploaded(item.id)}
                />
              ))
            )}
          </ul>
        </section>

        <section className="flex min-h-[420px] flex-col rounded-lg border border-gray-200 bg-gray-50/50 p-4">
          <h2 className="mb-3 font-semibold text-gray-800">Converted (CFR)</h2>
          <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {output.length === 0 ? (
              <li className="text-gray-500 text-sm">No outputs yet.</li>
            ) : (
              output.map((item) => (
                <VideoRow
                  key={item.id}
                  item={item}
                  selected={
                    selection?.kind === "output" && selection.id === item.id
                  }
                  onSelect={() => setSelection({ kind: "output", id: item.id })}
                  onDelete={() => void handleDeleteOutput(item.id)}
                />
              ))
            )}
          </ul>
        </section>

        <aside className="flex min-h-[420px] flex-col rounded-lg border border-gray-200 bg-white p-4 lg:min-h-0">
          <h2 className="mb-3 font-semibold text-gray-800">Metadata</h2>
          {!detail ? (
            <p className="text-gray-500 text-sm">
              Select an uploaded or converted video.
            </p>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-gray-500">Label</dt>
                <dd className="truncate font-medium">{detail.label}</dd>
                <dt className="text-gray-500">Size</dt>
                <dd>{formatVideoFileSize(detail.sizeBytes)}</dd>
                <dt className="text-gray-500">Duration</dt>
                <dd>{formatDuration(detail.durationSeconds)}</dd>
                <dt className="text-gray-500">Created</dt>
                <dd>{formatDate(detail.createdAt)}</dd>
                <dt className="text-gray-500">SHA-256</dt>
                <dd className="break-all font-mono text-xs">{detail.sha256}</dd>
                {detail.sourceUploadId ? (
                  <>
                    <dt className="text-gray-500">Source</dt>
                    <dd className="font-mono text-xs">
                      {detail.sourceUploadId}
                    </dd>
                  </>
                ) : null}
              </dl>
              {selection?.kind === "output" ? (
                <button
                  type="button"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                  onClick={() => downloadOutputVideo(selection.id)}
                >
                  Download MP4
                </button>
              ) : null}
              <pre className="min-h-0 flex-1 overflow-auto rounded-md bg-gray-50 p-3 font-mono text-[11px] text-gray-800 leading-relaxed">
                {detail.metadataMarkdown}
              </pre>
            </div>
          )}
        </aside>
      </div>

      <ImportJobProgressPanel
        display={progressDisplay}
        isLive={isUploading || isConverting}
      />

      {errorMessage ? (
        <p className="mt-4 whitespace-pre-wrap text-red-600 text-sm">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};
