"use client";

import axios from "axios";
import { AlertTriangle, CheckCircle2, Download, Upload } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";

type ImportResult =
  | {
      kind: "idle";
    }
  | {
      kind: "success";
      importedCount: number;
      rows: Array<{
        rowNumber: number;
        name: string;
        email: string;
        department: string;
      }>;
    }
  | {
      kind: "partial";
      fileName: string;
      message: string;
    }
  | {
      kind: "error";
      message: string;
    };

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const getNestBaseUrl = () => {
  return process.env.NEXT_PUBLIC_NESTJS ?? "http://localhost:3001";
};

const downloadBlob = (data: ArrayBuffer, fileName: string) => {
  const blob = new Blob([data], { type: XLSX_CONTENT_TYPE });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const parseJsonResponse = (data: ArrayBuffer) => {
  const text = new TextDecoder().decode(data);
  return JSON.parse(text);
};

const getAttachmentFileName = (
  contentDisposition: string | undefined,
  fallback: string,
) => {
  const fileName = contentDisposition?.match(/filename="?([^"]+)"?/)?.[1];
  return fileName ?? fallback;
};

export const Content = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult>({ kind: "idle" });
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingSample, setIsDownloadingSample] = useState(false);

  const handleDownloadSample = async () => {
    setIsDownloadingSample(true);
    setResult({ kind: "idle" });

    try {
      const response = await axios.get<ArrayBuffer>(
        "/applications/import-207-error-xlsx/sample",
        {
          baseURL: getNestBaseUrl(),
          responseType: "arraybuffer",
        },
      );
      const fileName = getAttachmentFileName(
        response.headers["content-disposition"],
        "people-import-sample.xlsx",
      );
      downloadBlob(response.data, fileName);
    } catch (error) {
      setResult({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Failed to download sample",
      });
    } finally {
      setIsDownloadingSample(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setResult({ kind: "error", message: "Choose an XLSX file first." });
      return;
    }
    if (!file.name.endsWith(".xlsx")) {
      setResult({ kind: "error", message: "Only .xlsx files are accepted." });
      return;
    }

    setIsUploading(true);
    setResult({ kind: "idle" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post<ArrayBuffer>(
        "/applications/import-207-error-xlsx/people",
        formData,
        {
          baseURL: getNestBaseUrl(),
          responseType: "arraybuffer",
        },
      );

      if (response.status === 207) {
        const fileName = getAttachmentFileName(
          response.headers["content-disposition"],
          "people-import-errors.xlsx",
        );
        downloadBlob(response.data, fileName);
        setResult({
          kind: "partial",
          fileName,
          message:
            response.headers["x-error-message"] ??
            "Some rows were imported and some need correction.",
        });
        return;
      }

      const json = parseJsonResponse(response.data);
      setResult({
        kind: "success",
        importedCount: json.importedCount,
        rows: json.rows,
      });
    } catch (error) {
      setResult({
        kind: "error",
        message: axios.isAxiosError(error)
          ? (error.response?.data &&
              new TextDecoder().decode(error.response.data)) ||
            error.message
          : "Upload failed",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-2 border-zinc-200 border-b pb-5">
          <p className="font-medium text-sm text-teal-700">
            HTTP 207 partial-success import
          </p>
          <h1 className="font-semibold text-2xl tracking-normal">
            XLSX People Import
          </h1>
          <p className="max-w-2xl text-sm text-zinc-600 leading-6">
            Upload a workbook with Name, Email, and Department columns. Valid
            rows are accepted; invalid rows download as an error workbook.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <label className="flex flex-col gap-2 font-medium text-sm text-zinc-800">
              XLSX file
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:font-medium file:text-sm file:text-white"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isUploading}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 font-medium text-sm text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                <Upload size={16} />
                {isUploading ? "Uploading" : "Upload"}
              </button>
              <button
                type="button"
                onClick={handleDownloadSample}
                disabled={isDownloadingSample}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 font-medium text-sm text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                <Download size={16} />
                {isDownloadingSample ? "Preparing" : "Sample"}
              </button>
            </div>
          </form>

          <aside className="rounded-lg border border-zinc-200 bg-white p-5 text-sm shadow-sm">
            <h2 className="font-semibold">Expected columns</h2>
            <dl className="mt-3 grid grid-cols-[90px_1fr] gap-y-2 text-zinc-600">
              <dt className="font-medium text-zinc-800">A</dt>
              <dd>Name</dd>
              <dt className="font-medium text-zinc-800">B</dt>
              <dd>Email</dd>
              <dt className="font-medium text-zinc-800">C</dt>
              <dd>Department</dd>
            </dl>
          </aside>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          {result.kind === "idle" && (
            <p className="text-sm text-zinc-500">No import result yet.</p>
          )}

          {result.kind === "success" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={18} />
                <p className="font-medium text-sm">
                  Imported {result.importedCount} rows.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-140 text-left text-sm">
                  <thead className="border-zinc-200 border-b text-zinc-500">
                    <tr>
                      <th className="py-2 font-medium">Row</th>
                      <th className="py-2 font-medium">Name</th>
                      <th className="py-2 font-medium">Email</th>
                      <th className="py-2 font-medium">Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => (
                      <tr key={`${row.rowNumber}-${row.email}`}>
                        <td className="py-2 text-zinc-500">{row.rowNumber}</td>
                        <td className="py-2">{row.name}</td>
                        <td className="py-2">{row.email}</td>
                        <td className="py-2">{row.department}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.kind === "partial" && (
            <div className="flex items-start gap-3 text-amber-800">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <div>
                <p className="font-medium text-sm">{result.message}</p>
                <p className="mt-1 text-amber-700 text-sm">
                  Downloaded {result.fileName}.
                </p>
              </div>
            </div>
          )}

          {result.kind === "error" && (
            <div className="flex items-start gap-3 text-red-700">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <p className="font-medium text-sm">{result.message}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
