import type { ImportJobProgressDisplay } from "./processing-job-sse";

type ImportJobProgressPanelProps = {
  display: ImportJobProgressDisplay | null;
  isLive: boolean;
};

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-gray-600 text-xs">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-gray-200"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function LayerBlock({
  title,
  label,
  detail,
  percent,
  emphasized,
}: {
  title: string;
  label: string;
  detail?: string;
  percent?: number;
  emphasized?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="font-medium text-gray-500 text-xs uppercase tracking-wide">
        {title}
      </p>
      <p
        className={`mt-1 text-lg ${
          emphasized ? "font-semibold text-blue-900" : "text-gray-900"
        }`}
      >
        {label}
      </p>
      {detail ? <p className="mt-1 text-gray-600 text-sm">{detail}</p> : null}
      {percent != null ? (
        <ProgressBar percent={percent} label="Progress" />
      ) : null}
    </div>
  );
}

export function ImportJobProgressPanel({
  display,
  isLive,
}: ImportJobProgressPanelProps) {
  if (!display) {
    return null;
  }

  const showDomainStage =
    display.domainStage != null && display.jobPhase.label === "Processing";

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-5">
          <LayerBlock
            title="Job phase"
            label={display.jobPhase.label}
            detail={display.jobPhase.detail}
            percent={
              display.domainStage == null ? display.jobPhase.percent : undefined
            }
            emphasized={isLive && !showDomainStage}
          />
          {showDomainStage && display.domainStage ? (
            <LayerBlock
              title="Domain stage"
              label={display.domainStage.label}
              detail={display.domainStage.detail}
              percent={display.domainStage.percent}
              emphasized={isLive}
            />
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
