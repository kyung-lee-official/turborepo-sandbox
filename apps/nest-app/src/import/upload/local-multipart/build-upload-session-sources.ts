import type { SourceSpec } from "@/async-processing/async-processing.types";
import type { UploadSessionSources } from "@/async-processing/start-processing-adapters/upload-session.types";

/** Default allowlist for tabular XLSX uploads (see import-plugin-tabular-xlsx). */
export const DEFAULT_TABULAR_XLSX_MIMES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
] as const;

export function assertAllowedMimeType(
  sourceId: string,
  mimeType: string,
  allowedMimeTypes: readonly string[] = DEFAULT_TABULAR_XLSX_MIMES,
): void {
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error(
      `Invalid MIME type for ${sourceId}: ${mimeType || "(empty)"}`,
    );
  }
}

export function buildUploadSessionSources(
  filesBySourceId: Record<string, Express.Multer.File>,
  sourceSpecs: readonly SourceSpec[],
  options?: {
    allowedMimeBySourceId?: Record<string, readonly string[]>;
    defaultAllowedMimeTypes?: readonly string[];
  },
): UploadSessionSources {
  const sources: UploadSessionSources = {};
  const defaultAllowed =
    options?.defaultAllowedMimeTypes ?? DEFAULT_TABULAR_XLSX_MIMES;

  for (const spec of sourceSpecs) {
    const file = filesBySourceId[spec.sourceId];
    if (!file) {
      if (spec.required) {
        throw new Error(`Missing required upload field: ${spec.sourceId}`);
      }
      continue;
    }

    const allowed =
      options?.allowedMimeBySourceId?.[spec.sourceId] ?? defaultAllowed;
    assertAllowedMimeType(spec.sourceId, file.mimetype, [...allowed]);

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
