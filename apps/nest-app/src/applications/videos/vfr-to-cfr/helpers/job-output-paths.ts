import { join } from "node:path";
import { VFR_TO_CFR_DOMAIN_KIND } from "../vfr-to-cfr.constants";

export function getVfrToCfrOutputBaseDir(): string {
  return join(process.cwd(), "temp", VFR_TO_CFR_DOMAIN_KIND);
}

export function buildVfrToCfrOutputPath(jobId: string): string {
  return join(getVfrToCfrOutputBaseDir(), `${jobId}.mp4`);
}

export function buildVfrToCfrDownloadFileName(jobId: string): string {
  return `cfr-${jobId}.mp4`;
}
