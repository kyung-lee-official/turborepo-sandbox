"use client";

import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState } from "react";
import { queryClient } from "@/app/data-fetching/tanstack-query/queryClient";
import { getFetcherErrorMessage } from "@/lib/fetcher";
import { writeNeonRandomNumber } from "./api";

const NeonTestForm = () => {
  const [databaseUrl, setDatabaseUrl] = useState("");

  const mutation = useMutation({
    mutationFn: () => writeNeonRandomNumber({ databaseUrl }),
  });

  const canSubmit = databaseUrl.trim().length > 0 && !mutation.isPending;

  return (
    <div className="space-y-6">
      <form
        className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) {
            mutation.mutate();
          }
        }}
      >
        <div className="space-y-1">
          <label
            className="block font-medium text-neutral-200 text-sm"
            htmlFor="neon-database-url"
          >
            Neon database URL
          </label>
          <input
            autoComplete="off"
            className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-neutral-100 text-sm outline-none focus:border-neutral-400"
            id="neon-database-url"
            onChange={(event) => setDatabaseUrl(event.target.value)}
            placeholder="postgresql://user:password@ep-...neon.tech/db?sslmode=require"
            spellCheck={false}
            type="password"
            value={databaseUrl}
          />
          <p className="text-neutral-500 text-xs">
            Used by the Next.js server for this request only. Held in React
            state, not saved, and cleared by a page refresh.
          </p>
        </div>

        <button
          className="rounded bg-emerald-600 px-4 py-2 font-medium text-sm text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSubmit}
          type="submit"
        >
          {mutation.isPending ? "Writing..." : "Generate & write"}
        </button>
      </form>

      {mutation.isError ? (
        <div className="rounded-lg border border-red-900 bg-red-950/50 p-6">
          <h2 className="mb-2 font-semibold text-red-300">Request failed</h2>
          <p className="wrap-break-word text-red-200 text-sm">
            {getFetcherErrorMessage(mutation.error)}
          </p>
        </div>
      ) : null}

      {mutation.data ? (
        <div className="space-y-3 rounded-lg border border-emerald-900 bg-emerald-950/40 p-6">
          <div className="flex flex-wrap items-center gap-3 text-emerald-200 text-xs">
            <span className="rounded-full bg-emerald-800 px-2 py-1 font-medium text-emerald-100">
              row id: {mutation.data.id}
            </span>
            <span>
              updated at:{" "}
              {dayjs(mutation.data.updatedAt).format("YYYY-MM-DD HH:mm:ss")}
            </span>
          </div>
          <div>
            <h2 className="mb-2 font-semibold text-emerald-100">
              Written to the database
            </h2>
            <p className="font-mono font-semibold text-5xl text-emerald-50 tabular-nums">
              {mutation.data.value}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Page = () => {
  return (
    <main className="min-h-svh bg-neutral-950 text-neutral-100">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
        <header className="space-y-2">
          <h1 className="font-bold text-2xl">Neon</h1>
          <p className="text-neutral-400 text-sm">
            A minimal Neon test. One table (
            <code className="font-mono text-neutral-200">
              neon_random_number
            </code>
            ), one row (
            <code className="font-mono text-neutral-200">id = 1</code>
            ). Paste a Neon connection string, click the button, and the server
            runs idempotent DDL and upserts a random number into that row.
          </p>
        </header>

        <QueryClientProvider client={queryClient}>
          <NeonTestForm />
        </QueryClientProvider>

        <section className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-sm">
          <h2 className="font-semibold text-neutral-200">
            What this exercises
          </h2>
          <ul className="list-inside list-disc space-y-1 text-neutral-400">
            <li>
              <code className="font-mono text-neutral-300">
                CREATE TABLE IF NOT EXISTS
              </code>{" "}
              — safe to run on every request
            </li>
            <li>
              A <code className="font-mono text-neutral-300">pg</code> pool
              created from the runtime-supplied connection URL
            </li>
            <li>
              An <code className="font-mono text-neutral-300">ON CONFLICT</code>{" "}
              upsert that keeps exactly one row
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
};

export default Page;
