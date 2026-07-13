import { BadRequestException } from "@nestjs/common";
import type { DomainKindRegistration } from "@/async-processing/async-processing.types";
import {
  assertAllowedMimeType,
  DEFAULT_TABULAR_XLSX_MIMES,
} from "../local-multipart/build-upload-session-sources";

export type InitiateFileInput = {
  sourceId: string;
  originalName: string;
  mimeType?: string;
};

export function validateInitiateFiles(
  files: InitiateFileInput[],
  registration: DomainKindRegistration,
): void {
  const { sourceSpecs, upload: uploadPolicy } = registration;
  const allowedIds = new Set(sourceSpecs.map((spec) => spec.sourceId));
  const seen = new Set<string>();
  const defaultAllowed =
    uploadPolicy?.defaultAllowedMimeTypes ?? DEFAULT_TABULAR_XLSX_MIMES;

  for (const file of files) {
    if (seen.has(file.sourceId)) {
      throw new BadRequestException(
        `Duplicate sourceId in initiate request: ${file.sourceId}`,
      );
    }
    seen.add(file.sourceId);

    if (!allowedIds.has(file.sourceId)) {
      throw new BadRequestException(`Unknown sourceId: ${file.sourceId}`);
    }

    const spec = sourceSpecs.find((entry) => entry.sourceId === file.sourceId);
    if (!spec) {
      continue;
    }

    const mimeType = file.mimeType?.trim();
    if (mimeType) {
      const allowed =
        uploadPolicy?.allowedMimeBySourceId?.[file.sourceId] ?? defaultAllowed;
      try {
        assertAllowedMimeType(file.sourceId, mimeType, [...allowed]);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : "Invalid MIME type",
        );
      }
    }
  }

  for (const spec of sourceSpecs) {
    if (!spec.required) {
      continue;
    }
    if (!seen.has(spec.sourceId)) {
      throw new BadRequestException(
        `Missing required sourceId in initiate request: ${spec.sourceId}`,
      );
    }
  }
}
