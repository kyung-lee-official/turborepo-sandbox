"use client";

import Link from "next/link";
import { useState } from "react";
import { SalesDataNav } from "../sales-data/SalesDataNav";
import { type FixtureBundle, generateTestFixtures } from "./api";

function formatFileSummary(file: {
  originalName: string;
  lineCount?: number;
  rowCount?: number;
}): string {
  if (file.lineCount) {
    return `${file.originalName} (${file.lineCount.toLocaleString()} lines)`;
  }
  if (file.rowCount) {
    return `${file.originalName} (${file.rowCount.toLocaleString()} rows incl. header)`;
  }
  return file.originalName;
}

function formatBundleSummary(bundle: FixtureBundle): string {
  const shared = [
    `  • ${formatFileSummary(bundle.inventory)}`,
    `  • ${formatFileSummary(bundle.productDescriptions)}`,
  ];
  const salesData = bundle.salesDataVariants.map(
    (file) =>
      `  • ${formatFileSummary(file)} — Products ${file.productsVariant} → expected ${file.expectedOutcome}`,
  );

  return (
    `dir: ${bundle.bundleDir}\n` +
    `shared:\n${shared.join("\n")}\n` +
    `salesData variants:\n${salesData.join("\n")}`
  );
}

export const GenerateSalesImportFixtures = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateFixtures = async () => {
    setIsGenerating(true);

    try {
      const result = await generateTestFixtures();

      alert(
        `Test fixture bundle generated (${(result.totalTimeMs / 1000).toFixed(1)}s total):\n\n${formatBundleSummary(result.bundle)}`,
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
      <SalesDataNav current="generate" />

      <h1 className="mb-6 font-bold text-3xl">
        Generate Sales Import Test Fixtures
      </h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 font-semibold text-xl">Generate Test Files</h2>
        <div className="mb-4 space-y-3">
          <p className="text-gray-600">
            Generates one <code className="text-sm">sales-import</code> bundle
            with shared perfect inventory and JSONL files, plus three{" "}
            <code className="text-sm">salesData</code> workbooks that differ
            only on the Products sheet.
          </p>
          <div className="space-y-4 text-gray-700 text-sm">
            <div>
              <p className="font-medium">
                <strong>inventory.xlsx</strong> — upload slot{" "}
                <code className="text-xs">inventory</code>, always perfect
              </p>
            </div>
            <div>
              <p className="font-medium">
                <strong>productDescriptions.jsonl</strong> — upload slot{" "}
                <code className="text-xs">productDescriptions</code>, always
                perfect
              </p>
            </div>
            <div>
              <p className="font-medium">
                <strong>salesData-*.xlsx</strong> — upload slot{" "}
                <code className="text-xs">salesData</code> (pick one variant)
              </p>
              <ul className="mt-1 list-inside list-disc space-y-1 pl-2">
                <li>
                  LineItems is always perfect (~150k data rows plus header)
                </li>
                <li>
                  Products varies by file:{" "}
                  <code className="text-xs">salesData-perfect.xlsx</code>,{" "}
                  <code className="text-xs">
                    salesData-partially_available.xlsx
                  </code>
                  , <code className="text-xs">salesData-fail_fast.xlsx</code>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-green-400 border-l-4 bg-green-50 p-3">
            <p className="text-green-700 text-sm">
              <strong>perfect:</strong> full Products catalog — expected{" "}
              <code>success</code>.
            </p>
          </div>
          <div className="border-orange-400 border-l-4 bg-orange-50 p-3">
            <p className="text-orange-700 text-sm">
              <strong>partially_available:</strong> every 10th catalog SKU
              omitted from Products — expected <code>validation_failed</code>.
            </p>
          </div>
          <div className="border-red-400 border-l-4 bg-red-50 p-3">
            <p className="text-red-700 text-sm">
              <strong>fail_fast:</strong> Products sheet omitted — expected{" "}
              <code>failed</code>.
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
            "Generate Test Fixtures"
          )}
        </button>
      </div>

      <div className="border-blue-400 border-l-4 bg-blue-50 p-4">
        <div className="ml-3 space-y-2 text-blue-700 text-sm">
          <p>
            <strong>File location:</strong> Bundle is saved under{" "}
            <code>apps/nest-app/temp/sales-import-&#123;timestamp&#125;/</code>
          </p>
          <p>
            <strong>Upload slots:</strong> Use multipart field names{" "}
            <code>salesData</code>, <code>inventory</code>,{" "}
            <code>productDescriptions</code> on the{" "}
            <Link
              href="/files/import-sales-test-fixtures"
              className="font-medium text-blue-700 underline hover:text-blue-900"
            >
              import sales test fixtures
            </Link>{" "}
            page. Rename the chosen <code>salesData-*.xlsx</code> locally if
            your uploader expects <code>salesData.xlsx</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
