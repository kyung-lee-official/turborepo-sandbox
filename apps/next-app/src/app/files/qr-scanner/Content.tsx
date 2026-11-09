"use client";

import { Check, Copy, ImageUp, Loader2, ScanLine } from "lucide-react";
import QrScanner from "qr-scanner";
import { useEffect, useRef, useState } from "react";

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());

const Content = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  async function scan(target: File) {
    setBusy(true);
    setError("");
    setResult("");

    try {
      const { data } = await QrScanner.scanImage(target, {
        returnDetailedScanResult: true,
      });
      setResult(data);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(
        message.includes(QrScanner.NO_QR_CODE_FOUND)
          ? `No QR code found in "${target.name}".`
          : `Could not read "${target.name}": ${message}`,
      );
    } finally {
      setBusy(false);
    }
  }

  function handleFile(next: File | undefined) {
    if (!next) {
      return;
    }
    if (!next.type.startsWith("image/")) {
      setError(`"${next.name}" is not an image.`);
      return;
    }

    setFile(next);
    setPreview(URL.createObjectURL(next));
    void scan(next);
  }

  function clear() {
    setFile(null);
    setPreview("");
    setResult("");
    setError("");
    setCopied(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-semibold text-2xl">
          <ScanLine className="size-6" />
          QR Scanner
        </h1>
        <p className="text-gray-600 text-sm">
          Pick a QR code image from disk. It is decoded in the browser with{" "}
          <code className="rounded-sm bg-gray-200 px-1 py-0.5 font-mono text-[0.9em]">
            qr-scanner
          </code>
          ; the image is never uploaded.
        </p>
      </header>

      <section className="space-y-4 rounded-lg border border-gray-300 border-dashed bg-white/60 p-6">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        {preview ? (
          // biome-ignore lint/performance/noImgElement: blob URL preview, not a static asset
          <img
            src={preview}
            alt="Selected QR code"
            className="mx-auto max-h-80 rounded border border-gray-200 bg-white object-contain"
          />
        ) : (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-gray-500">
            <ImageUp className="size-10" />
            <p className="text-sm">No image selected</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md bg-gray-900 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-gray-800"
          >
            {file ? "Choose another image" : "Choose image"}
          </button>

          {file ? (
            <button
              type="button"
              onClick={() => scan(file)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ScanLine className="size-4" />
              )}
              {busy ? "Scanning..." : "Scan again"}
            </button>
          ) : null}

          {file || result || error ? (
            <button
              type="button"
              onClick={clear}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50"
            >
              Clear
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
            {error}
          </p>
        ) : null}
      </section>

      {result ? (
        <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium">Decoded value</h2>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 text-gray-600 text-sm transition-colors hover:text-gray-900"
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded border border-gray-200 bg-gray-50 p-3 font-mono text-sm">
            {result}
          </pre>

          {isHttpUrl(result) ? (
            <a
              href={result}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-block text-blue-600 text-sm underline-offset-2 hover:underline"
            >
              Open link
            </a>
          ) : null}
        </section>
      ) : null}
    </main>
  );
};

export default Content;
