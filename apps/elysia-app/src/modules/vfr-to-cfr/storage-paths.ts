import { join } from "node:path";
import { VFR_TO_CFR_DOMAIN_KIND } from "./constants.ts";

export function getVfrToCfrBaseDir(): string {
  return join(process.cwd(), "temp", VFR_TO_CFR_DOMAIN_KIND);
}

export function getUploadedDir(): string {
  return join(getVfrToCfrBaseDir(), "uploaded");
}

export function getOutputDir(): string {
  return join(getVfrToCfrBaseDir(), "output");
}

export function buildUploadedVideoPath(id: string): string {
  return join(getUploadedDir(), `${id}.mp4`);
}

export function buildUploadedMetadataPath(id: string): string {
  return join(getUploadedDir(), `${id}.md`);
}

export function buildOutputVideoPath(id: string): string {
  return join(getOutputDir(), `${id}.mp4`);
}

export function buildOutputMetadataPath(id: string): string {
  return join(getOutputDir(), `${id}.md`);
}
