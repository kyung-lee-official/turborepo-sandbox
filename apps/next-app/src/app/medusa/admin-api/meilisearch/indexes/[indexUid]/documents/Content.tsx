"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/app/medusa/components/Alert";
import { Button } from "@/app/medusa/components/Button";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { TextInput } from "@/app/medusa/components/TextInput";
import {
  deleteAllMeilisearchDocuments,
  getMeilisearchDocuments,
  postMeilisearchDocuments,
  QK_MEILISEARCH_ADMIN,
} from "../../../api";

const IDX_ROOT = "/medusa/admin-api/meilisearch/indexes";

const Content = () => {
  const params = useParams();
  const raw = params.indexUid;
  const indexUid =
    typeof raw === "string" ? decodeURIComponent(raw) : String(raw ?? "");
  const qc = useQueryClient();

  const [limit, setLimit] = useState("20");
  const [offset, setOffset] = useState("0");
  const [postJson, setPostJson] = useState(
    '[\n  { "id": "sample-1", "title": "Sample" }\n]',
  );

  const listQ = useQuery({
    queryKey: [
      QK_MEILISEARCH_ADMIN.DOCUMENTS,
      indexUid,
      limit,
      offset,
    ],
    queryFn: () =>
      getMeilisearchDocuments(indexUid, {
        limit: Number(limit) || 20,
        offset: Number(offset) || 0,
      }),
    enabled: Boolean(indexUid),
  });

  const postM = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(postJson) as Record<string, unknown>[];
      if (!Array.isArray(parsed)) {
        throw new Error("Body must be a JSON array of documents.");
      }
      return postMeilisearchDocuments(indexUid, parsed);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: [QK_MEILISEARCH_ADMIN.DOCUMENTS, indexUid],
      });
    },
  });

  const delM = useMutation({
    mutationFn: () => deleteAllMeilisearchDocuments(indexUid),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: [QK_MEILISEARCH_ADMIN.DOCUMENTS, indexUid],
      });
    },
  });

  return (
    <div>
      <PageHeading
        title={`Documents · ${indexUid}`}
        description={
          <>
            GET list, POST array (primaryKey=id), DELETE all. Pencil:{" "}
            <span className="font-mono text-xs">
              MeilisearchAdminIndexTools.pen
            </span>
          </>
        }
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`${IDX_ROOT}/${encodeURIComponent(indexUid)}/embedders`}>
          <Button type="button" variant="outline" size="compact" fullWidth={false}>
            Embedders
          </Button>
        </Link>
        <Link href="/medusa/admin-api/meilisearch/indexes">
          <Button type="button" variant="outline" size="compact" fullWidth={false}>
            All indexes
          </Button>
        </Link>
      </div>

      <PixelSurface shadow="md" className="mt-8 p-6">
        <h2 className="font-bold text-gray-900">Browse</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="block w-24">
            <span className="mb-1 block text-gray-600 text-xs">limit</span>
            <TextInput
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </label>
          <label className="block w-24">
            <span className="mb-1 block text-gray-600 text-xs">offset</span>
            <TextInput
              value={offset}
              onChange={(e) => setOffset(e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="compact"
              fullWidth={false}
              disabled={listQ.isFetching}
              onClick={() => listQ.refetch()}
            >
              Refresh
            </Button>
          </div>
        </div>

        {listQ.isError && (
          <Alert title="Load failed" variant="error" appearance="pixel" className="mt-4">
            {listQ.error instanceof Error ? listQ.error.message : "Error"}
          </Alert>
        )}

        {listQ.isSuccess && (
          <pre className="mt-4 max-h-96 overflow-auto rounded-none bg-stone-900 p-3 font-mono text-stone-100 text-xs">
            {JSON.stringify(listQ.data, null, 2)}
          </pre>
        )}
      </PixelSurface>

      <PixelSurface shadow="md" className="mt-8 p-6">
        <h2 className="font-bold text-gray-900">Add / replace documents</h2>
        <p className="mt-1 text-gray-600 text-sm">
          JSON array only. Server sends <code className="font-mono">primaryKey=id</code>.
        </p>
        <textarea
          className="mt-3 h-48 w-full resize-y border border-gray-300 bg-white p-3 font-mono text-sm"
          value={postJson}
          onChange={(e) => setPostJson(e.target.value)}
          spellCheck={false}
        />
        {postM.isError && (
          <Alert title="POST failed" variant="error" appearance="pixel" className="mt-3">
            {postM.error instanceof Error ? postM.error.message : "Error"}
          </Alert>
        )}
        <Button
          type="button"
          className="mt-3"
          disabled={postM.isPending}
          onClick={() => postM.mutate()}
        >
          {postM.isPending ? "Sending…" : "POST documents"}
        </Button>
      </PixelSurface>

      <PixelSurface shadow="md" className="mt-8 p-6">
        <h2 className="font-bold text-red-800">Danger zone</h2>
        <p className="mt-1 text-gray-600 text-sm">
          DELETE removes every document in this index.
        </p>
        {delM.isError && (
          <Alert title="Delete failed" variant="error" appearance="pixel" className="mt-3">
            {delM.error instanceof Error ? delM.error.message : "Error"}
          </Alert>
        )}
        <Button
          type="button"
          variant="danger"
          className="mt-4"
          disabled={delM.isPending}
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              window.confirm(
                `Delete ALL documents in index "${indexUid}"? This cannot be undone.`,
              )
            ) {
              delM.mutate();
            }
          }}
        >
          {delM.isPending ? "Deleting…" : "Delete all documents"}
        </Button>
      </PixelSurface>
    </div>
  );
};

export default Content;
