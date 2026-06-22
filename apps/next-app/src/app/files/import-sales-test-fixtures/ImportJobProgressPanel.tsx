import type { ProgressLine } from "./processing-job-sse";

type ImportJobProgressPanelProps = {
  lines: ProgressLine[];
  isLive: boolean;
};

export function ImportJobProgressPanel({
  lines,
  isLive,
}: ImportJobProgressPanelProps) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-900 text-lg">Import progress</h2>
        {isLive ? (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 font-medium text-green-800 text-xs">
            Live
          </span>
        ) : null}
      </div>
      <ol className="space-y-3">
        {lines.map((line, index) => {
          const isLatest = index === lines.length - 1;
          return (
            <li
              key={line.id}
              className={`flex gap-3 border-gray-100 border-l-2 pl-3 ${
                isLatest && isLive ? "border-blue-500" : "border-gray-200"
              }`}
            >
              <time className="shrink-0 font-mono text-gray-400 text-xs">
                {line.timestamp.toLocaleTimeString()}
              </time>
              <div className="min-w-0">
                <p
                  className={`text-sm ${
                    isLatest && isLive
                      ? "font-semibold text-blue-900"
                      : "text-gray-800"
                  }`}
                >
                  {line.label}
                </p>
                {line.detail ? (
                  <p className="mt-0.5 text-gray-600 text-xs">{line.detail}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
