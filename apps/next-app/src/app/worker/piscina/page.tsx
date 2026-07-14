"use client";

import { useState } from "react";

export default function PiscinaPage() {
  const [max, setMax] = useState(10_000_000);
  const [result, setResult] = useState<{
    primes: number;
    durationMs: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const nestBaseUrl =
        process.env.NEXT_PUBLIC_NESTJS ?? "http://localhost:3001";
      const res = await fetch(
        `${nestBaseUrl}/worker/piscina/count-primes?max=${max}`,
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert(String(err));
    } finally {
      setLoading(false);
    }
  };

  const [pingResult, setPingResult] = useState<string | null>(null);

  const ping = async () => {
    const nestBaseUrl =
      process.env.NEXT_PUBLIC_NESTJS ?? "http://localhost:3001";
    const start = performance.now();
    const res = await fetch(`${nestBaseUrl}/worker/piscina/ping`);
    const data = await res.json();
    const ms = Math.round(performance.now() - start);
    setPingResult(`responded in ${ms}ms — ${data.at}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="font-bold text-2xl">Piscina Worker Thread Pool</h1>

      <section className="space-y-2 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">How Piscina Works</h2>
        <ol className="list-inside list-decimal space-y-1 text-sm">
          <li>
            <strong>Create a pool</strong> — instantiate <code>Piscina</code>{" "}
            with a worker file path and thread limits.
          </li>
          <li>
            <strong>Submit tasks</strong> — call <code>pool.run(data)</code> to
            offload CPU-heavy work to a worker thread.
          </li>
          <li>
            <strong>Worker executes</strong> — Piscina calls the worker
            file&apos;s <code>export default</code> function with the submitted
            data.
          </li>
          <li>
            <strong>Get result</strong> — <code>run()</code> resolves with the
            worker&apos;s return value. The pool reuses threads automatically.
          </li>
        </ol>
      </section>

      <section className="space-y-3 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">Try It</h2>
        <p className="text-gray-600 text-sm">
          Count prime numbers up to N — a CPU-heavy task offloaded to a Piscina
          worker thread on the NestJS backend.
        </p>
        <div className="flex items-center gap-3">
          <label className="text-sm">
            Max:
            <input
              type="number"
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
              className="ml-2 w-32 rounded border px-2 py-1"
            />
          </label>
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-1 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Running..." : "Run"}
          </button>
        </div>
        {result && (
          <div className="rounded bg-gray-100 p-3 text-sm">
            <p>
              Primes found: <strong>{result.primes.toLocaleString()}</strong>
            </p>
            <p>
              Duration: <strong>{result.durationMs} ms</strong> (worker thread)
            </p>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={ping}
            className="rounded bg-green-600 px-4 py-1 text-white hover:bg-green-700"
          >
            Ping
          </button>
          {pingResult && (
            <span className="text-gray-600 text-sm">{pingResult}</span>
          )}
        </div>
        <p className="text-gray-500 text-xs">
          Tip: click <strong>Run</strong> with a large Max, then immediately
          click <strong>Ping</strong>. If Ping responds instantly, the event
          loop is not blocked.
        </p>
      </section>

      <section className="space-y-2 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">NestJS Module Structure</h2>
        <pre className="overflow-x-auto rounded bg-gray-900 p-4 text-gray-100 text-xs">
          {`applications/
  worker/              ← WorkerModule
    worker.module.ts
    piscina/           ← PiscinaModule (submodule)
      piscina.module.ts
      piscina.controller.ts
      piscina.service.ts
      heavy-task.worker.ts`}
        </pre>
      </section>
    </div>
  );
}
