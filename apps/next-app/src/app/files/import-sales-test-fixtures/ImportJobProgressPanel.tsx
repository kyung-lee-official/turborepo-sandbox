import type { CurrentJobPhase } from "./processing-job-sse";

type ImportJobProgressPanelProps = {
  phase: CurrentJobPhase | null;
  isLive: boolean;
};

export function ImportJobProgressPanel({
  phase,
  isLive,
}: ImportJobProgressPanelProps) {
  if (!phase) {
    return null;
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-gray-500 text-xs uppercase tracking-wide">
            Current phase
          </p>
          <p
            className={`mt-1 text-lg ${
              isLive ? "font-semibold text-blue-900" : "text-gray-900"
            }`}
          >
            {phase.label}
          </p>
          {phase.detail ? (
            <p className="mt-1 text-gray-600 text-sm">{phase.detail}</p>
          ) : null}
        </div>
        {isLive ? (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 font-medium text-green-800 text-xs">
            Live
          </span>
        ) : null}
      </div>
    </div>
  );
}
