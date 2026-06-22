import { extname } from "node:path";

const MIME_TO_EXTENSION: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/x-ndjson": ".jsonl",
  "application/json": ".jsonl",
  "application/octet-stream": ".bin",
};

export function extensionFromMime(mimeType: string | undefined): string {
  if (!mimeType) {
    return ".bin";
  }
  return MIME_TO_EXTENSION[mimeType] ?? ".bin";
}

export function extensionFromOriginalName(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  if (ext === ".xlsx" || ext === ".jsonl") {
    return ext;
  }
  return "";
}
