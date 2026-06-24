import { BadRequestException } from "@nestjs/common";
import type { StartProcessingInput } from "../async-processing.types";
import type {
  UploadSession,
  UploadSessionSources,
} from "./upload-session.types";

export function mapSessionSourcesToStartInput(
  domainKind: string,
  sessionSources: UploadSessionSources,
): StartProcessingInput {
  const entries = Object.entries(sessionSources);
  if (entries.length === 0) {
    throw new BadRequestException("At least one source is required");
  }

  return {
    domainKind,
    sources: Object.fromEntries(
      entries.map(([key, entry]) => {
        if (key !== entry.sourceId) {
          throw new BadRequestException(
            `sourceId mismatch: ${key} vs ${entry.sourceId}`,
          );
        }
        return [
          key,
          {
            sourceId: entry.sourceId,
            label: entry.originalName,
            mimeType: entry.mimeType,
            locator: entry.locator,
          },
        ];
      }),
    ),
  };
}

export function mapUploadSessionToStartInput(
  session: Pick<UploadSession, "domainKind" | "sources" | "context">,
): StartProcessingInput {
  return {
    ...mapSessionSourcesToStartInput(session.domainKind, session.sources),
    context: session.context,
  };
}
