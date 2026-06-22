import type { SourceSpec } from "@/async-processing/async-processing.types";
import type { UploadSessionSources } from "@/async-processing/start-processing-adapters/upload-session.types";

const ALLOWED_MIME_BY_SOURCE: Record<string, readonly string[]> = {
  salesData: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  inventory: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  productDescriptions: [
    "application/x-ndjson",
    "application/json",
    "application/octet-stream",
  ],
};

export function assertAllowedMimeType(
  sourceId: string,
  mimeType: string,
): void {
  const allowed = ALLOWED_MIME_BY_SOURCE[sourceId];
  if (!allowed?.includes(mimeType)) {
    throw new Error(
      `Invalid MIME type for ${sourceId}: ${mimeType || "(empty)"}`,
    );
  }
}

export function buildUploadSessionSources(
  filesBySourceId: Record<string, Express.Multer.File>,
  sourceSpecs: readonly SourceSpec[],
): UploadSessionSources {
  const sources: UploadSessionSources = {};

  for (const spec of sourceSpecs) {
    const file = filesBySourceId[spec.sourceId];
    if (!file) {
      if (spec.required) {
        throw new Error(`Missing required upload field: ${spec.sourceId}`);
      }
      continue;
    }

    assertAllowedMimeType(spec.sourceId, file.mimetype);

    sources[spec.sourceId] = {
      sourceId: spec.sourceId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      locator: {
        kind: "local",
        path: file.path,
        declaredSizeBytes: file.size,
      },
    };
  }

  const allowedIds = new Set(sourceSpecs.map((spec) => spec.sourceId));
  for (const sourceId of Object.keys(filesBySourceId)) {
    if (!allowedIds.has(sourceId)) {
      throw new Error(`Unexpected upload field: ${sourceId}`);
    }
  }

  return sources;
}
