"use client";

import { useRef, useState } from "react";
import { SalesImportFixturesNav } from "../sales-import-fixtures/SalesImportFixturesNav";

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

export const ImportSalesTestFixtures = () => {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [selectedFiles, setSelectedFiles] = useState<
    Record<string, File | undefined>
  >({});

  const allSelected = UPLOAD_SLOTS.every(
    (slot) => selectedFiles[slot.sourceId],
  );

  const handleFileChange = (sourceId: string, file: File | undefined) => {
    setSelectedFiles((prev) => ({ ...prev, [sourceId]: file }));
  };

  const handleUpload = () => {
    if (!allSelected) {
      return;
    }
    alert(
      "Upload and start processing are not wired yet.\n\n" +
        "Next backend steps: upload-local-multipart (3 fields), UploadSessionStore, " +
        "POST /applications/async-processing/start, and the sales-report domain runner.",
    );
  };

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
                className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-700 hover:file:bg-blue-100"
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
        disabled={!allSelected}
        className={`rounded-lg px-6 py-3 font-medium ${
          allSelected
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "cursor-not-allowed bg-gray-300 text-gray-500"
        } transition-colors`}
      >
        Upload and start import
      </button>

      <div className="mt-6 border-amber-400 border-l-4 bg-amber-50 p-4">
        <p className="text-amber-900 text-sm">
          <strong>Backend pending:</strong> multipart upload, session store, and
          domain runner are not implemented yet. This page defines the
          three-file UX aligned with{" "}
          <code>applications/sales-import/README.md</code>.
        </p>
      </div>
    </div>
  );
};
