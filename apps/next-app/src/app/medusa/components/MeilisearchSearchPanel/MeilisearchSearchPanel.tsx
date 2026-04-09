"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Alert } from "@/app/medusa/components/Alert";
import { Button } from "@/app/medusa/components/Button";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { TextInput } from "@/app/medusa/components/TextInput";
import { cn } from "@/lib/utils";
import {
  getStoreSearch,
  QK_STORE_SEARCH,
  type StoreSearchHit,
} from "@/app/medusa/store-api/search/api";

function hitTitle(hit: StoreSearchHit): string {
  const t = hit.title;
  if (typeof t === "string") return t;
  return String(hit.id ?? "—");
}

function hitSubtitle(hit: StoreSearchHit): string {
  const handle = hit.handle;
  const desc = hit.description;
  const parts: string[] = [];
  if (typeof handle === "string") parts.push(handle);
  if (typeof desc === "string" && desc.length > 0) {
    parts.push(desc.slice(0, 120) + (desc.length > 120 ? "…" : ""));
  }
  return parts.join(" · ") || JSON.stringify(hit).slice(0, 80);
}

type MeilisearchSearchPanelProps = {
  /** Shown under the form when no search has run yet */
  idleHint?: string;
};

export const MeilisearchSearchPanel = ({
  idleHint = 'Enter a query and submit to call GET /store-api/search.',
}: MeilisearchSearchPanelProps) => {
  const [qInput, setQInput] = useState("");
  const [hybridInput, setHybridInput] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");
  const [submittedHybrid, setSubmittedHybrid] = useState<string | undefined>(
    undefined,
  );

  const enabled = submittedQ.trim().length > 0;

  const searchQuery = useQuery({
    queryKey: [QK_STORE_SEARCH.SEARCH, submittedQ, submittedHybrid],
    queryFn: async () => {
      return await getStoreSearch({
        q: submittedQ.trim(),
        ...(submittedHybrid !== undefined && submittedHybrid !== ""
          ? { hybridEmbedder: submittedHybrid }
          : {}),
      });
    },
    enabled,
  });

  const metaLine = useMemo(() => {
    if (!searchQuery.data) return null;
    const { pagination, processingTimeMs, hybrid } = searchQuery.data;
    const parts = [
      `${pagination.total} hits`,
      `${processingTimeMs ?? "—"} ms`,
    ];
    if (hybrid) {
      parts.push(`hybrid ${hybrid.embedder} · ${hybrid.semanticRatio}`);
    }
    return parts.join(" · ");
  }, [searchQuery.data]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = qInput.trim();
    if (!q) return;
    setSubmittedQ(q);
    const h = hybridInput.trim();
    setSubmittedHybrid(h === "" ? undefined : h);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <PixelSurface shadow="md" className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1">
            <span className="mb-1 block font-semibold text-gray-700 text-sm">
              Query (q)
            </span>
            <TextInput
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="e.g. wool sweater"
              name="q"
              autoComplete="off"
            />
          </label>
          <Button type="submit" className="sm:w-auto sm:shrink-0" fullWidth>
            Search
          </Button>
        </div>
        <label className="mt-4 block max-w-md">
          <span className="mb-1 block font-semibold text-gray-700 text-sm">
            hybridEmbedder
          </span>
          <TextInput
            value={hybridInput}
            onChange={(e) => setHybridInput(e.target.value)}
            placeholder="omit → 0.5, or default, or 0–1"
            name="hybridEmbedder"
            autoComplete="off"
          />
          <span className="mt-1 block text-gray-500 text-xs">
            Leave empty for default ratio 0.5. Use{" "}
            <code className="font-mono">default</code> or a number like{" "}
            <code className="font-mono">0.5</code>.
          </span>
        </label>
      </PixelSurface>

      {!enabled && <p className="text-gray-500 text-sm">{idleHint}</p>}

      {searchQuery.isFetching && enabled && (
        <PixelSurface className="p-6" shadow="sm">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-1/3 bg-stone-200" />
            <div className="h-24 bg-stone-200" />
          </div>
        </PixelSurface>
      )}

      {searchQuery.isError && enabled && (
        <Alert title="Search failed" variant="error" appearance="pixel">
          {searchQuery.error instanceof Error
            ? searchQuery.error.message
            : "Unknown error"}
        </Alert>
      )}

      {searchQuery.isSuccess && enabled && searchQuery.data && (
        <PixelSurface shadow="md" className="p-6">
          <h2 className="font-bold text-gray-900 text-lg">Results</h2>
          {metaLine ? (
            <p className="mt-1 text-gray-600 text-sm">{metaLine}</p>
          ) : null}
          <ul className="mt-4 flex flex-col gap-3">
            {searchQuery.data.hits.length === 0 ? (
              <li className="text-gray-500 text-sm">No hits.</li>
            ) : (
              searchQuery.data.hits.map((hit, i) => {
                const id =
                  typeof hit.id === "string" || typeof hit.id === "number"
                    ? String(hit.id)
                    : `idx-${i}`;
                return (
                  <li key={id}>
                    <div
                      className={cn(
                        "border border-stone-200 bg-stone-50 p-3",
                        "rounded-none",
                      )}
                    >
                      <div className="font-semibold text-gray-900">
                        {hitTitle(hit)}
                      </div>
                      <div className="mt-0.5 font-mono text-gray-500 text-xs">
                        {id}
                      </div>
                      <div className="mt-1 text-gray-600 text-sm">
                        {hitSubtitle(hit)}
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </PixelSurface>
      )}
    </form>
  );
};
