"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/app/medusa/components/Alert";
import { Button, medusaButtonClassName } from "@/app/medusa/components/Button";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { TextInput } from "@/app/medusa/components/TextInput";
import {
  createMeilisearchIndex,
  getMeilisearchIndexes,
  QK_MEILISEARCH_ADMIN,
} from "../api";

const ROOT = "/medusa/admin-api/meilisearch/indexes";

function indexRows(data: unknown): { uid: string; primaryKey?: string }[] {
  if (!data || typeof data !== "object") return [];
  const r = (data as { results?: unknown }).results;
  if (!Array.isArray(r)) return [];
  return r
    .filter(
      (x): x is { uid: string } =>
        !!x &&
        typeof x === "object" &&
        typeof (x as { uid?: unknown }).uid === "string",
    )
    .map((x) => ({
      uid: (x as { uid: string }).uid,
      primaryKey: (x as { primaryKey?: string }).primaryKey,
    }));
}

const Content = () => {
  const qc = useQueryClient();
  const [newUid, setNewUid] = useState("");
  const [newPk, setNewPk] = useState("id");

  const listQ = useQuery({
    queryKey: [QK_MEILISEARCH_ADMIN.INDEXES],
    queryFn: () => getMeilisearchIndexes(),
  });

  const createM = useMutation({
    mutationFn: () =>
      createMeilisearchIndex({
        uid: newUid.trim(),
        primaryKey: newPk.trim() || "id",
      }),
    onSuccess: async () => {
      setNewUid("");
      await qc.invalidateQueries({ queryKey: [QK_MEILISEARCH_ADMIN.INDEXES] });
    },
  });

  return (
    <div>
      <PageHeading
        title="Indexes"
        description={
          <>
            Manage indexes. Pencil:{" "}
            <span className="font-mono text-xs">
              MeilisearchAdminIndexes.pen
            </span>
          </>
        }
      />

      <PixelSurface shadow="md" className="mt-8 p-6">
        <h2 className="font-bold text-gray-900">Create index</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1">
            <span className="mb-1 block font-semibold text-gray-700 text-sm">
              uid
            </span>
            <TextInput
              value={newUid}
              onChange={(e) => setNewUid(e.target.value)}
              placeholder="e.g. products"
            />
          </label>
          <label className="block w-full sm:w-36">
            <span className="mb-1 block font-semibold text-gray-700 text-sm">
              primaryKey
            </span>
            <TextInput
              value={newPk}
              onChange={(e) => setNewPk(e.target.value)}
              placeholder="id"
            />
          </label>
          <Button
            type="button"
            className="sm:w-auto sm:shrink-0"
            fullWidth
            disabled={!newUid.trim() || createM.isPending}
            onClick={() => createM.mutate()}
          >
            {createM.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
        {createM.isError && (
          <Alert title="Create failed" variant="error" appearance="pixel" className="mt-4">
            {createM.error instanceof Error
              ? createM.error.message
              : "Unknown error"}
          </Alert>
        )}
        {createM.isSuccess && (
          <p className="mt-3 text-green-800 text-sm">
            Request accepted — check tasks for progress.
          </p>
        )}
      </PixelSurface>

      {listQ.isPending && (
        <PixelSurface className="mt-8 p-6" shadow="sm">
          <div className="animate-pulse h-32 bg-stone-200" />
        </PixelSurface>
      )}

      {listQ.isError && (
        <div className="mt-8">
          <Alert title="Failed to load indexes" variant="error" appearance="pixel">
            {listQ.error instanceof Error ? listQ.error.message : "Unknown error"}
          </Alert>
        </div>
      )}

      {listQ.isSuccess && (
        <ul className="mt-8 flex flex-col gap-3">
          {indexRows(listQ.data).length === 0 ? (
            <li className="text-gray-500 text-sm">No indexes returned.</li>
          ) : (
            indexRows(listQ.data).map((row) => (
              <li key={row.uid}>
                <PixelSurface shadow="sm" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{row.uid}</div>
                    <div className="font-mono text-gray-500 text-xs">
                      primaryKey: {row.primaryKey ?? "—"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`${ROOT}/${encodeURIComponent(row.uid)}/documents`}
                      className={medusaButtonClassName("outline", {
                        fullWidth: false,
                        size: "compact",
                      })}
                    >
                      Documents
                    </Link>
                    <Link
                      href={`${ROOT}/${encodeURIComponent(row.uid)}/embedders`}
                      className={medusaButtonClassName("outline", {
                        fullWidth: false,
                        size: "compact",
                      })}
                    >
                      Embedders
                    </Link>
                  </div>
                </PixelSurface>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default Content;
