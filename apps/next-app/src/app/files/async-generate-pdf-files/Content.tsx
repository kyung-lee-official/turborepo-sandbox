"use client";

import { useCallback, useEffect, useState } from "react";
import type { ImportJobProgressDisplay } from "../import-sales-test-fixtures/processing-job-sse";
import { formatPdfProgressText, waitForPdfJobViaSse } from "./pdf-job-sse";

const nestBaseUrl = process.env.NEXT_PUBLIC_NESTJS ?? "http://localhost:3001";

type MockInfoRow = {
  name: string;
  email: string;
  age: number;
  gender: string;
  invoiceDate: string;
  lineItemCount: number;
};

type MockInfoMeta = {
  invoiceCount: number;
  lineItemsPerInvoice: number;
  auditEntriesPerInvoice: number;
};

type JobOutputFile = {
  name: string;
  sizeBytes: number;
};

type StartJobResponse = {
  jobId: string;
  manifestId: string;
  outputDirName: string;
  zipFileName: string;
};

async function readNestErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (typeof body.message === "string") {
      return body.message;
    }
    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }
  } catch {
    // Response body is not JSON.
  }
  return response.statusText || "Request failed";
}

export const Content = () => {
  const [mockRows, setMockRows] = useState<MockInfoRow[]>([]);
  const [mockMeta, setMockMeta] = useState<MockInfoMeta | null>(null);
  const [outputDirName, setOutputDirName] = useState<string | null>(null);
  const [zipFile, setZipFile] = useState<JobOutputFile | null>(null);
  const [progressDisplay, setProgressDisplay] =
    useState<ImportJobProgressDisplay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  const refreshMockInfo = useCallback(async () => {
    setIsLoadingInfo(true);
    setError(null);
    try {
      const response = await fetch(`${nestBaseUrl}/async-generate-pdf/info`);
      if (!response.ok) {
        throw new Error(await readNestErrorMessage(response));
      }
      const data = (await response.json()) as {
        meta: MockInfoMeta;
        rows: MockInfoRow[];
      };
      setMockMeta(data.meta);
      setMockRows(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mock info");
    } finally {
      setIsLoadingInfo(false);
    }
  }, []);

  useEffect(() => {
    void refreshMockInfo();
  }, [refreshMockInfo]);

  const refreshOutputFiles = useCallback(async (jobId: string) => {
    const response = await fetch(
      `${nestBaseUrl}/async-generate-pdf/jobs/${jobId}/files`,
    );
    if (!response.ok) {
      throw new Error(await readNestErrorMessage(response));
    }
    const data = (await response.json()) as {
      outputBaseDir: string;
      zipFile: JobOutputFile | null;
    };
    setZipFile(data.zipFile);
    return data;
  }, []);

  const generatePdfs = async () => {
    setIsGenerating(true);
    setError(null);
    setProgressDisplay(null);
    setZipFile(null);
    setOutputDirName(null);

    try {
      const startResponse = await fetch(
        `${nestBaseUrl}/async-generate-pdf/jobs`,
        {
          method: "POST",
        },
      );
      if (!startResponse.ok) {
        throw new Error(await readNestErrorMessage(startResponse));
      }

      const started = (await startResponse.json()) as StartJobResponse;
      setOutputDirName(started.outputDirName);

      const snapshot = await waitForPdfJobViaSse(started.jobId, nestBaseUrl, {
        onDisplayChange: setProgressDisplay,
      });

      if (snapshot.phase === "failed") {
        throw new Error("PDF generation job failed");
      }

      await refreshOutputFiles(started.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const progressText = progressDisplay
    ? formatPdfProgressText(progressDisplay)
    : null;

  return (
    <main className="max-w-2xl space-y-6 p-12">
      <div className="space-y-2">
        <h1 className="font-semibold text-xl">async-generate-pdf-files</h1>
        <p className="text-neutral-700 text-sm">
          Start an async-processing job over{" "}
          {mockMeta
            ? `${mockMeta.invoiceCount} mock invoice rows (${mockMeta.lineItemsPerInvoice} line items and ${mockMeta.auditEntriesPerInvoice} audit entries each)`
            : "large mock invoice rows"}
          . Progress reflects real pdfkit work per file, then archiver zips the
          output folder. The zip is saved as{" "}
          <code className="rounded bg-neutral-200 px-1">
            apps/nest-app/temp/async-generate-pdf/{"{timestamp}-{jobId}.zip"}
          </code>
          . Live progress comes from{" "}
          <code className="rounded bg-neutral-200 px-1">
            /jobs/:jobId/events
          </code>
          .
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          onClick={() => void generatePdfs()}
          disabled={isGenerating || isLoadingInfo}
        >
          {isGenerating ? "Generating…" : "Generate PDF files"}
        </button>
        <button
          type="button"
          className="rounded bg-neutral-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          onClick={() => void refreshMockInfo()}
          disabled={isGenerating || isLoadingInfo}
        >
          {isLoadingInfo ? "Refreshing…" : "Refresh mock info"}
        </button>
      </div>

      {error ? (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-red-800 text-sm">
          {error}
        </p>
      ) : null}

      {progressText ? (
        <section className="space-y-2 rounded border border-blue-200 bg-blue-50 p-4 text-sm">
          <h2 className="font-medium text-blue-900">Job progress</h2>
          <p className="text-blue-900">{progressText}</p>
          {progressDisplay?.domainStage?.percent != null ? (
            <p className="text-blue-800">
              {progressDisplay.domainStage.percent}% complete
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-medium">Mock info</h2>
        {mockRows.length === 0 ? (
          <p className="text-neutral-600 text-sm">No mock rows loaded.</p>
        ) : (
          <div className="max-h-80 overflow-x-auto overflow-y-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-neutral-300 border-b text-left">
                  <th className="px-2 py-1">Name</th>
                  <th className="px-2 py-1">Email</th>
                  <th className="px-2 py-1">Age</th>
                  <th className="px-2 py-1">Gender</th>
                  <th className="px-2 py-1">Invoice date</th>
                  <th className="px-2 py-1">Line items</th>
                </tr>
              </thead>
              <tbody>
                {mockRows.map((row) => (
                  <tr key={row.email} className="border-neutral-200 border-b">
                    <td className="px-2 py-1">{row.name}</td>
                    <td className="px-2 py-1">{row.email}</td>
                    <td className="px-2 py-1">{row.age}</td>
                    <td className="px-2 py-1">{row.gender}</td>
                    <td className="px-2 py-1">{row.invoiceDate}</td>
                    <td className="px-2 py-1">{row.lineItemCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {outputDirName ? (
        <p className="text-neutral-500 text-xs">
          Job output name: <code>{outputDirName}.zip</code>
        </p>
      ) : null}

      {zipFile ? (
        <section className="space-y-2">
          <h2 className="font-medium">Generated zip</h2>
          <p className="text-sm">
            {zipFile.name} ({zipFile.sizeBytes.toLocaleString()} bytes)
          </p>
        </section>
      ) : null}
    </main>
  );
};
