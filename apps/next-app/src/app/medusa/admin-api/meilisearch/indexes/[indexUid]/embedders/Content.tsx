"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/app/medusa/components/Alert";
import { Button } from "@/app/medusa/components/Button";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import {
  deleteMeilisearchEmbedders,
  getMeilisearchEmbedders,
  patchMeilisearchEmbedders,
  postMeilisearchEmbeddersPreset,
  QK_MEILISEARCH_ADMIN,
} from "../../../api";

const IDX_ROOT = "/medusa/admin-api/meilisearch/indexes";

const Content = () => {
  const params = useParams();
  const raw = params.indexUid;
  const indexUid =
    typeof raw === "string" ? decodeURIComponent(raw) : String(raw ?? "");
  const qc = useQueryClient();
  const [patchJson, setPatchJson] = useState("{\n  \n}");

  const getQ = useQuery({
    queryKey: [QK_MEILISEARCH_ADMIN.EMBEDDERS, indexUid],
    queryFn: () => getMeilisearchEmbedders(indexUid),
    enabled: Boolean(indexUid),
  });

  const patchM = useMutation({
    mutationFn: async () => {
      const body = JSON.parse(patchJson) as Record<string, unknown>;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new Error("PATCH body must be a JSON object.");
      }
      return patchMeilisearchEmbedders(indexUid, body);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: [QK_MEILISEARCH_ADMIN.EMBEDDERS, indexUid],
      });
    },
  });

  const resetM = useMutation({
    mutationFn: () => deleteMeilisearchEmbedders(indexUid),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: [QK_MEILISEARCH_ADMIN.EMBEDDERS, indexUid],
      });
    },
  });

  const presetM = useMutation({
    mutationFn: () => postMeilisearchEmbeddersPreset(indexUid),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: [QK_MEILISEARCH_ADMIN.EMBEDDERS, indexUid],
      });
      await qc.invalidateQueries({ queryKey: [QK_MEILISEARCH_ADMIN.TASKS] });
    },
  });

  return (
    <div>
      <PageHeading
        title={`Embedders · ${indexUid}`}
        description={
          <>
            Meilisearch embedder settings. Pencil:{" "}
            <span className="font-mono text-xs">
              MeilisearchAdminEmbedders.pen
            </span>
          </>
        }
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`${IDX_ROOT}/${encodeURIComponent(indexUid)}/documents`}>
          <Button type="button" variant="outline" size="compact" fullWidth={false}>
            Documents
          </Button>
        </Link>
        <Link href="/medusa/admin-api/meilisearch/indexes">
          <Button type="button" variant="outline" size="compact" fullWidth={false}>
            All indexes
          </Button>
        </Link>
      </div>

      <PixelSurface shadow="md" className="mt-8 p-6">
        <h2 className="font-bold text-gray-900">Current (GET)</h2>
        {getQ.isPending && (
          <div className="mt-3 h-32 animate-pulse bg-stone-200" />
        )}
        {getQ.isError && (
          <Alert title="GET failed" variant="error" appearance="pixel" className="mt-3">
            {getQ.error instanceof Error ? getQ.error.message : "Error"}
          </Alert>
        )}
        {getQ.isSuccess && (
          <pre className="mt-3 max-h-64 overflow-auto rounded-none bg-stone-900 p-3 font-mono text-stone-100 text-xs">
            {JSON.stringify(getQ.data, null, 2)}
          </pre>
        )}
        <Button
          type="button"
          variant="outline"
          size="compact"
          fullWidth={false}
          className="mt-3"
          disabled={getQ.isFetching}
          onClick={() => getQ.refetch()}
        >
          Refresh
        </Button>
      </PixelSurface>

      <PixelSurface shadow="md" className="mt-8 p-6">
        <h2 className="font-bold text-gray-900">Preset: Ollama REST (bge-m3)</h2>
        <p className="mt-1 text-gray-600 text-sm">
          Applies the server-defined embedder: REST →{" "}
          <code className="font-mono text-xs">
            http://127.0.0.1:11434/api/embed
          </code>{" "}
          with model <code className="font-mono text-xs">bge-m3:latest</code>,
          dimensions 1024, and the default document template.
        </p>
        {presetM.isError && (
          <Alert
            title="Preset failed"
            variant="error"
            appearance="pixel"
            className="mt-3"
          >
            {presetM.error instanceof Error ? presetM.error.message : "Error"}
          </Alert>
        )}
        <Button
          type="button"
          className="mt-4"
          disabled={presetM.isPending}
          onClick={() => presetM.mutate()}
        >
          {presetM.isPending ? "Applying…" : "Apply Ollama bge-m3 preset"}
        </Button>
      </PixelSurface>

      <PixelSurface shadow="md" className="mt-8 p-6">
        <h2 className="font-bold text-gray-900">PATCH embedders</h2>
        <p className="mt-1 text-gray-600 text-sm">
          Send a JSON object matching Meilisearch embedders configuration.
        </p>
        <textarea
          className="mt-3 h-48 w-full resize-y border border-indigo-200 bg-white p-3 font-mono text-sm"
          value={patchJson}
          onChange={(e) => setPatchJson(e.target.value)}
          spellCheck={false}
        />
        {patchM.isError && (
          <Alert title="PATCH failed" variant="error" appearance="pixel" className="mt-3">
            {patchM.error instanceof Error ? patchM.error.message : "Error"}
          </Alert>
        )}
        <Button
          type="button"
          className="mt-3"
          disabled={patchM.isPending}
          onClick={() => patchM.mutate()}
        >
          {patchM.isPending ? "Applying…" : "PATCH embedders"}
        </Button>
      </PixelSurface>

      <PixelSurface shadow="md" className="mt-8 p-6">
        <h2 className="font-bold text-red-800">Reset embedders</h2>
        <p className="mt-1 text-gray-600 text-sm">
          DELETE clears embedder configuration for this index.
        </p>
        {resetM.isError && (
          <Alert title="Reset failed" variant="error" appearance="pixel" className="mt-3">
            {resetM.error instanceof Error ? resetM.error.message : "Error"}
          </Alert>
        )}
        <Button
          type="button"
          variant="danger"
          className="mt-4"
          disabled={resetM.isPending}
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              window.confirm(
                `Reset embedders for index "${indexUid}"?`,
              )
            ) {
              resetM.mutate();
            }
          }}
        >
          {resetM.isPending ? "Resetting…" : "Reset embedders"}
        </Button>
      </PixelSurface>
    </div>
  );
};

export default Content;
