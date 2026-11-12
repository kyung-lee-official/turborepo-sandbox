"use client";

import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient } from "@/app/data-fetching/tanstack-query/queryClient";
import {
  getGrokMinimumApiTestErrorMessage,
  runGrokMinimumApiTest,
} from "./api";
import { DEFAULT_GROK_MODEL } from "./constants";

const TestForm = () => {
  const [token, setToken] = useState("");
  const [model, setModel] = useState(DEFAULT_GROK_MODEL);

  const mutation = useMutation({
    mutationFn: () => runGrokMinimumApiTest({ token, model }),
  });

  const canSubmit = token.trim().length > 0 && !mutation.isPending;

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
            htmlFor="grok-token"
          >
            xAI API token
          </label>
          <input
            autoComplete="off"
            className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-neutral-100 text-sm outline-none focus:border-neutral-400"
            id="grok-token"
            onChange={(event) => setToken(event.target.value)}
            placeholder="xai-..."
            spellCheck={false}
            type="password"
            value={token}
          />
          <p className="text-neutral-500 text-xs">
            Held in React state only. It is not saved to storage and is cleared
            by a page refresh.
          </p>
        </div>

        <div className="space-y-1">
          <label
            className="block font-medium text-neutral-200 text-sm"
            htmlFor="grok-model"
          >
            Model
          </label>
          <input
            autoComplete="off"
            className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-neutral-100 text-sm outline-none focus:border-neutral-400"
            id="grok-model"
            onChange={(event) => setModel(event.target.value)}
            spellCheck={false}
            type="text"
            value={model}
          />
        </div>

        <button
          className="rounded bg-emerald-600 px-4 py-2 font-medium text-sm text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSubmit}
          type="submit"
        >
          {mutation.isPending ? "Calling Grok..." : "Run test"}
        </button>
      </form>

      {mutation.isError ? (
        <div className="rounded-lg border border-red-900 bg-red-950/50 p-6">
          <h2 className="mb-2 font-semibold text-red-300">Request failed</h2>
          <p className="break-words text-red-200 text-sm">
            {getGrokMinimumApiTestErrorMessage(mutation.error)}
          </p>
        </div>
      ) : null}

      {mutation.data ? (
        <div className="space-y-4 rounded-lg border border-emerald-900 bg-emerald-950/40 p-6">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-full bg-emerald-800 px-2 py-1 font-medium text-emerald-100">
              {mutation.data.model}
            </span>
            <span className="text-emerald-200">
              finish reason: {mutation.data.finishReason}
            </span>
            <span className="text-emerald-200">
              {mutation.data.latencyMs} ms
            </span>
            <span className="text-emerald-200">
              tokens: {mutation.data.usage.inputTokens ?? "?"} in /{" "}
              {mutation.data.usage.outputTokens ?? "?"} out
            </span>
          </div>
          <div>
            <h2 className="mb-2 font-semibold text-emerald-100">
              Grok replied
            </h2>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-emerald-900 bg-neutral-950 p-3 font-mono text-emerald-50 text-sm">
              {mutation.data.text}
            </pre>
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
          <h1 className="font-bold text-2xl">Grok Minimum API Test</h1>
          <p className="text-neutral-400 text-sm">
            The smallest end-to-end call through{" "}
            <code className="rounded bg-neutral-900 px-1 py-0.5 font-mono text-neutral-200 text-xs">
              @ai-sdk/xai
            </code>
            . Paste an xAI token, run one prompt, and read the reply. The token
            goes to this app&apos;s own API route, which calls xAI; it is never
            persisted.
          </p>
        </header>

        <QueryClientProvider client={queryClient}>
          <TestForm />
        </QueryClientProvider>

        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-sm">
          <h2 className="mb-2 font-semibold text-neutral-200">
            What this exercises
          </h2>
          <ul className="list-inside list-disc space-y-1 text-neutral-400">
            <li>
              <code className="font-mono text-neutral-300">createXai</code> with
              an explicit token
            </li>
            <li>
              <code className="font-mono text-neutral-300">generateText</code>{" "}
              with a single fixed prompt
            </li>
            <li>
              Token, finish reason, latency, and token usage in the response
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
};

export default Page;
