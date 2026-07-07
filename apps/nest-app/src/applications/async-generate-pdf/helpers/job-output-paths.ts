import { join } from "node:path";

export function buildJobOutputFolderName(
  startedAtTimestamp: number,
  jobId: string,
): string {
  return `${startedAtTimestamp}-${jobId}`;
}

export function buildJobOutputFolderPath(
  outputBaseDir: string,
  startedAtTimestamp: number,
  jobId: string,
): string {
  return join(
    outputBaseDir,
    buildJobOutputFolderName(startedAtTimestamp, jobId),
  );
}

export function buildJobOutputZipPath(
  outputBaseDir: string,
  startedAtTimestamp: number,
  jobId: string,
): string {
  return join(
    outputBaseDir,
    `${buildJobOutputFolderName(startedAtTimestamp, jobId)}.zip`,
  );
}
