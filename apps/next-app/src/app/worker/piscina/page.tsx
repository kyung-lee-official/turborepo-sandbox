"use client";

import { useRef, useState } from "react";

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

  // --- SSE progress demo ---
  const [streamPercent, setStreamPercent] = useState<number | null>(null);
  const [streamResult, setStreamResult] = useState<{
    primes: number;
    durationMs: number;
  } | null>(null);
  const [streaming, setStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const doneRef = useRef(false);

  const runWithProgress = () => {
    setStreamPercent(0);
    setStreamResult(null);
    setStreaming(true);
    doneRef.current = false;

    const nestBaseUrl =
      process.env.NEXT_PUBLIC_NESTJS ?? "http://localhost:3001";
    const es = new EventSource(
      `${nestBaseUrl}/worker/piscina/count-primes/stream?max=${max}`,
    );
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data) as {
        percent: number;
        primes?: number;
        durationMs?: number;
      };
      setStreamPercent(data.percent);
      if (data.percent === 100 && data.primes != null) {
        doneRef.current = true;
        setStreamResult({
          primes: data.primes,
          durationMs: data.durationMs ?? 0,
        });
        setStreaming(false);
        es.close();
      }
    };

    es.onerror = () => {
      if (!doneRef.current) {
        setStreaming(false);
      }
      es.close();
    };
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
            <strong>Worker communicates</strong> — the worker calls{" "}
            <code>parentPort.postMessage()</code> to send progress updates while
            computing.
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
          <button
            type="button"
            onClick={runWithProgress}
            disabled={streaming}
            className="rounded bg-purple-600 px-4 py-1 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {streaming ? "Streaming..." : "Run with progress"}
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
        {streamPercent !== null && (
          <div className="space-y-1">
            <div className="h-4 w-full overflow-hidden rounded bg-gray-200">
              <div
                className="h-full bg-purple-600 transition-all duration-300"
                style={{ width: `${streamPercent}%` }}
              />
            </div>
            <p className="text-gray-600 text-sm">
              Progress: <strong>{streamPercent}%</strong>
              {streamResult && (
                <>
                  {" — "}
                  <strong>{streamResult.primes.toLocaleString()}</strong> primes
                  in <strong>{streamResult.durationMs} ms</strong>
                </>
              )}
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
          Tip: click <strong>Run with progress</strong>, then immediately click{" "}
          <strong>Ping</strong>. If Ping responds instantly while the bar is
          filling, the event loop is not blocked.
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
