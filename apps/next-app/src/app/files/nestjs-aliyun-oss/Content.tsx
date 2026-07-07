"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";

const STAGING_PATH = "apps/nest-app/temp/upload-to-aliyun-oss";

type StagingFile = {
  name: string;
  sizeBytes: number;
};

type UploadedFile = {
  name: string;
  objectKey: string;
  url: string;
};

const nestBaseUrl = process.env.NEXT_PUBLIC_NESTJS ?? "http://localhost:3001";

export const Content = () => {
  const [stagingDir, setStagingDir] = useState<string>("");
  const [files, setFiles] = useState<StagingFile[]>([]);
  const [uploaded, setUploaded] = useState<UploadedFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const refreshStaging = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.get<{
        stagingDir: string;
        files: StagingFile[];
      }>(`${nestBaseUrl}/aliyun-oss/staging`);
      setStagingDir(res.data.stagingDir);
      setFiles(res.data.files);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to list staging files",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStaging();
  }, [refreshStaging]);

  const uploadStaging = async () => {
    setIsUploading(true);
    setError(null);
    setUploaded(null);
    try {
      const res = await axios.post<{ uploaded: UploadedFile[] }>(
        `${nestBaseUrl}/aliyun-oss/staging/upload`,
      );
      setUploaded(res.data.uploaded);
      await refreshStaging();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          typeof err.response?.data?.message === "string"
            ? err.response.data.message
            : Array.isArray(err.response?.data?.message)
              ? err.response.data.message.join(", ")
              : err.message;
        setError(message);
      } else {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="max-w-2xl space-y-6 p-12">
      <div className="space-y-2">
        <h1 className="font-semibold text-xl">nestjs upload to aliyun oss</h1>
        <p className="text-neutral-700 text-sm">
          This demo uploads files from a local NestJS staging folder to Aliyun
          OSS. The browser does not send file bytes; Nest reads disk and calls
          the OSS SDK.
        </p>
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-neutral-800 text-sm">
        <li>
          Place one or more files in{" "}
          <code className="rounded bg-neutral-200 px-1">{STAGING_PATH}</code>{" "}
          (relative to the repo root). Nest creates the folder on first request
          if it is missing.
        </li>
        <li>Click Refresh to list pending files from that folder.</li>
        <li>
          Click Upload to push every file in the folder to Aliyun OSS under the{" "}
          <code className="rounded bg-neutral-200 px-1">
            nest-to-aliyun-oss/
          </code>{" "}
          prefix (created on the bucket when missing).
        </li>
      </ol>

      <p className="text-neutral-600 text-sm">
        Nest needs{" "}
        <code className="rounded bg-neutral-200 px-1">
          ALIYUN_OSS_ACCESS_KEY_ID
        </code>
        ,{" "}
        <code className="rounded bg-neutral-200 px-1">
          ALIYUN_OSS_ACCESS_SECRET
        </code>
        , <code className="rounded bg-neutral-200 px-1">ALIYUN_OSS_REGION</code>
        , and{" "}
        <code className="rounded bg-neutral-200 px-1">ALIYUN_OSS_BUCKET</code>{" "}
        in the env files used when starting nest-app.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-neutral-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          onClick={() => void refreshStaging()}
          disabled={isLoading || isUploading}
        >
          {isLoading ? "Refreshing…" : "Refresh staging list"}
        </button>
        <button
          type="button"
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          onClick={() => void uploadStaging()}
          disabled={isUploading || files.length === 0}
        >
          {isUploading ? "Uploading…" : "Upload to Aliyun OSS"}
        </button>
      </div>

      {stagingDir ? (
        <p className="text-neutral-500 text-xs">
          Server staging path: <code>{stagingDir}</code>
        </p>
      ) : null}

      {error ? (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-red-800 text-sm">
          {error}
        </p>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-medium">Pending files</h2>
        {files.length === 0 ? (
          <p className="text-neutral-600 text-sm">
            No files in staging folder.
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {files.map((file) => (
              <li key={file.name}>
                {file.name} ({file.sizeBytes.toLocaleString()} bytes)
              </li>
            ))}
          </ul>
        )}
      </section>

      {uploaded ? (
        <section className="space-y-2">
          <h2 className="font-medium">Uploaded</h2>
          <ul className="space-y-2 text-sm">
            {uploaded.map((file) => (
              <li key={file.objectKey} className="rounded bg-neutral-100 p-3">
                <div>{file.name}</div>
                <div className="text-neutral-600">{file.objectKey}</div>
                <a
                  href={file.url}
                  className="break-all text-blue-600 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {file.url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
};
