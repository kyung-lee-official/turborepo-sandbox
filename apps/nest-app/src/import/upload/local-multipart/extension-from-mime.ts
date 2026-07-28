import { extname } from "node:path";

const MIME_TO_EXTENSION: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/x-ndjson": ".jsonl",
  "application/json": ".jsonl",
  "application/octet-stream": ".bin",
  "video/mp4": ".mp4",
};

const ALLOWED_ORIGINAL_EXTENSIONS = new Set([".xlsx", ".jsonl", ".mp4"]);

export function extensionFromMime(mimeType: string | undefined): string {
  if (!mimeType) {
    return ".bin";
  }
  return MIME_TO_EXTENSION[mimeType] ?? ".bin";
}

export function extensionFromOriginalName(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  if (ALLOWED_ORIGINAL_EXTENSIONS.has(ext)) {
    return ext;
  }
  return "";
}
