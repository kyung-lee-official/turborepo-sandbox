"use client";

import { useState } from "react";
import { generateTestFixtures, type ScenarioBundle } from "./api";

function formatBundleSummary(bundle: ScenarioBundle): string {
  const files = bundle.uploadSlots
    .map(
      (f) =>
        `  • ${f.uploadSlotId}: ${f.originalName}${f.lineCount ? ` (${f.lineCount.toLocaleString()} lines)` : f.rowCount ? ` (${f.rowCount.toLocaleString()} rows incl. header)` : ""}`,
    )
    .join("\n");
  return (
    `${bundle.scenario} → expected ${bundle.expectedOutcome}\n` +
    `  dir: ${bundle.bundleDir}\n` +
    files
  );
}

export const GenerateXlsx = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateFixtures = async () => {
    setIsGenerating(true);

    try {
      const result = await generateTestFixtures();
      const summary = result.bundles.map(formatBundleSummary).join("\n\n");

      alert(
        `Test fixture bundles generated (${(result.totalTimeMs / 1000).toFixed(1)}s total):\n\n${summary}`,
      );
    } catch (error) {
      console.error("Error generating test fixtures:", error);
      alert("Failed to generate test fixtures");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 font-bold text-3xl">
        Generate Sales Import Test Fixtures
      </h1>

      <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 font-semibold text-xl">Generate Test Files</h2>
        <div className="mb-4 space-y-3">
          <p className="text-gray-600">
            Generates three <code className="text-sm">sales-import</code>{" "}
            bundles aligned with async import upload slots. Each bundle
            includes:
          </p>
          <ul className="list-inside list-disc space-y-1 text-gray-700 text-sm">
            <li>
              <strong>salesData.xlsx</strong> — multi-sheet (Products +
              LineItems), ~50k rows per sheet
            </li>
            <li>
              <strong>inventory.xlsx</strong> — Inventory sheet (SKU, Inventory
              Qty), ~50k rows
            </li>
            <li>
              <strong>productDescriptions.jsonl</strong> — 100k lines (
              <code className="text-xs">sku</code>,{" "}
              <code className="text-xs">description</code>)
            </li>
          </ul>
          <div className="border-green-400 border-l-4 bg-green-50 p-3">
            <p className="text-green-700 text-sm">
              <strong>perfect:</strong> All slots valid — expected outcome{" "}
              <code>success</code>.
            </p>
          </div>
          <div className="border-orange-400 border-l-4 bg-orange-50 p-3">
            <p className="text-orange-700 text-sm">
              <strong>partial:</strong> ~10% invalid XLSX rows + JSONL lines —
              expected <code>validation_failed</code> when import runs.
            </p>
          </div>
          <div className="border-red-400 border-l-4 bg-red-50 p-3">
            <p className="text-red-700 text-sm">
              <strong>fail_fast:</strong> salesData missing LineItems sheet —
              expected <code>failed</code>.
            </p>
          </div>
        </div>

        <button
          onClick={generateFixtures}
          disabled={isGenerating}
          className={`rounded-lg px-6 py-3 font-medium ${
            isGenerating
              ? "cursor-not-allowed bg-gray-400"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white transition-colors`}
        >
          {isGenerating ? (
            <span className="flex items-center">
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2"></div>
              Generating Test Fixtures...
            </span>
          ) : (
            "Generate All Test Fixtures"
          )}
        </button>
      </div>

      <div className="border-blue-400 border-l-4 bg-blue-50 p-4">
        <div className="ml-3 space-y-2 text-blue-700 text-sm">
          <p>
            <strong>File location:</strong> Bundles are saved under{" "}
            <code>
              apps/nest-app/temp/sales-import-&#123;scenario&#125;-&#123;timestamp&#125;/
            </code>
          </p>
          <p>
            <strong>Upload slots:</strong> Use multipart field names{" "}
            <code>salesData</code>, <code>inventory</code>,{" "}
            <code>productDescriptions</code> when the async import runner is
            implemented.
          </p>
        </div>
      </div>
    </div>
  );
};
