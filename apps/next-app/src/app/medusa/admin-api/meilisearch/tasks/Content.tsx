"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/app/medusa/components/Alert";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { getMeilisearchTasks, QK_MEILISEARCH_ADMIN } from "../api";

function taskRows(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== "object") return [];
  const r = (data as { results?: unknown }).results;
  return Array.isArray(r)
    ? r.filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    : [];
}

const Content = () => {
  const q = useQuery({
    queryKey: [QK_MEILISEARCH_ADMIN.TASKS],
    queryFn: getMeilisearchTasks,
  });

  return (
    <div>
      <PageHeading
        title="Tasks"
        description={
          <>
            Latest Meilisearch tasks. Pencil:{" "}
            <span className="font-mono text-xs">MeilisearchAdminTasks.pen</span>
          </>
        }
      />

      {q.isPending && (
        <PixelSurface className="mt-8 p-6" shadow="sm">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-1/3 bg-stone-200" />
            <div className="h-20 bg-stone-200" />
          </div>
        </PixelSurface>
      )}

      {q.isError && (
        <div className="mt-8">
          <Alert title="Failed to load tasks" variant="error" appearance="pixel">
            {q.error instanceof Error ? q.error.message : "Unknown error"}
          </Alert>
        </div>
      )}

      {q.isSuccess && (
        <ul className="mt-8 flex flex-col gap-3">
          {taskRows(q.data).length === 0 ? (
            <li className="text-gray-500 text-sm">No tasks in response.</li>
          ) : (
            taskRows(q.data).map((task, i) => {
              const uid = task.uid ?? task.taskUid ?? i;
              const status = String(task.status ?? "—");
              const indexUid = String(task.indexUid ?? "—");
              return (
                <li key={String(uid)}>
                  <PixelSurface shadow="sm" className="p-4">
                    <div className="font-bold text-gray-900 capitalize">
                      {status}{" "}
                      <span className="font-normal text-gray-500 text-sm">
                        · index: {indexUid}
                      </span>
                    </div>
                    <pre className="mt-2 max-h-40 overflow-auto rounded-none bg-stone-100 p-2 font-mono text-xs">
                      {JSON.stringify(task, null, 2)}
                    </pre>
                  </PixelSurface>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};

export default Content;
