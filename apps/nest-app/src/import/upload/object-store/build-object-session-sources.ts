import { BadRequestException } from "@nestjs/common";
import type { UploadSessionSources } from "@/async-processing/start-processing-adapters/upload-session.types";
import type {
  ObjectStoreProvider,
  PendingObjectUpload,
} from "./pending-object-upload.types";

export type CompleteFileInput = {
  sourceId: string;
  declaredSizeBytes?: number;
};

export function buildObjectSessionSources(
  pending: PendingObjectUpload,
  completeFiles: CompleteFileInput[],
  provider: ObjectStoreProvider,
): UploadSessionSources {
  const sources: UploadSessionSources = {};
  const seen = new Set<string>();

  for (const file of completeFiles) {
    if (seen.has(file.sourceId)) {
      throw new BadRequestException(
        `Duplicate sourceId in complete request: ${file.sourceId}`,
      );
    }
    seen.add(file.sourceId);

    const pendingFile = pending.pending[file.sourceId];
    if (!pendingFile) {
      throw new BadRequestException(
        `Unknown or missing pending sourceId: ${file.sourceId}`,
      );
    }

    sources[file.sourceId] = {
      sourceId: file.sourceId,
      originalName: pendingFile.originalName,
      mimeType: pendingFile.mimeType,
      locator: {
        kind: "object",
        provider,
        bucket: pendingFile.bucket,
        key: pendingFile.key,
        declaredSizeBytes: file.declaredSizeBytes,
      },
    };
  }

  for (const sourceId of Object.keys(pending.pending)) {
    if (!seen.has(sourceId)) {
      throw new BadRequestException(
        `Complete request missing sourceId: ${sourceId}`,
      );
    }
  }

  return sources;
}
