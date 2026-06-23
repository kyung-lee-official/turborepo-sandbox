import type { ErrorDetail } from "./import-error.types";

export type ProcessingJobErrorsJsonlHeader = {
  kind: "header";
  jobId: string;
  domainKind: string;
  errorCount: number;
};

export function buildProcessingJobErrorsJsonl(options: {
  jobId: string;
  domainKind: string;
  errorCount: number;
  errors: readonly ErrorDetail[];
}): string {
  const header: ProcessingJobErrorsJsonlHeader = {
    kind: "header",
    jobId: options.jobId,
    domainKind: options.domainKind,
    errorCount: options.errorCount,
  };

  const lines = [
    JSON.stringify(header),
    ...options.errors.map((error) => JSON.stringify(error)),
  ];
  return `${lines.join("\n")}\n`;
}
