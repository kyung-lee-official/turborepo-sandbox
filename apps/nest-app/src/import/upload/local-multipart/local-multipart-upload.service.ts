import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { nanoid } from "nanoid";
import type { DomainKindRegistration } from "@/async-processing/async-processing.types";
import { UploadSessionStore } from "@/async-processing/start-processing-adapters/upload-session.store";
import {
  DEFAULT_UPLOAD_SESSION_TTL_SECONDS,
  PROCESSING_START_REQUESTED_EVENT,
} from "@/async-processing/start-processing-adapters/upload-session.types";
import { buildUploadSessionSources } from "./build-upload-session-sources";
import type { LocalUploadSession } from "./local-upload-session.types";
import { RESOLVED_UPLOAD_SESSION_ID } from "./multer-disk-storage.factory";
import { rollbackSavedPaths } from "./rollback-saved-paths";

type RequestWithSessionId = Express.Request & {
  [RESOLVED_UPLOAD_SESSION_ID]?: string;
};

@Injectable()
export class LocalMultipartUploadService {
  private readonly logger = new Logger(LocalMultipartUploadService.name);

  constructor(
    private readonly uploadSessionStore: UploadSessionStore,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handleUpload(
    files: Record<string, Express.Multer.File[] | undefined>,
    session: LocalUploadSession,
    registration: DomainKindRegistration,
    req: RequestWithSessionId,
  ): Promise<{ uploadSessionId: string } | { accepted: true }> {
    const { sourceSpecs, upload: uploadPolicy } = registration;
    const savedPaths: string[] = [];
    const filesBySourceId: Record<string, Express.Multer.File> = {};

    try {
      for (const spec of sourceSpecs) {
        const uploaded = files[spec.sourceId];
        if (!uploaded?.length) {
          if (spec.required) {
            throw new BadRequestException(
              `Missing required upload field: ${spec.sourceId}`,
            );
          }
          continue;
        }
        if (uploaded.length > 1) {
          throw new BadRequestException(
            `Expected one file for ${spec.sourceId}, got ${uploaded.length}`,
          );
        }
        const file = uploaded[0]!;
        filesBySourceId[spec.sourceId] = file;
        savedPaths.push(file.path);
      }

      for (const [fieldName, uploaded] of Object.entries(files)) {
        if (!uploaded?.length) {
          continue;
        }
        if (!sourceSpecs.some((spec) => spec.sourceId === fieldName)) {
          throw new BadRequestException(
            `Unexpected upload field: ${fieldName}`,
          );
        }
      }

      const sources = buildUploadSessionSources(filesBySourceId, sourceSpecs, {
        allowedMimeBySourceId: uploadPolicy?.allowedMimeBySourceId,
        defaultAllowedMimeTypes: uploadPolicy?.defaultAllowedMimeTypes,
      });
      const uploadSessionId =
        req[RESOLVED_UPLOAD_SESSION_ID] ??
        session.uploadSessionId?.trim() ??
        nanoid();

      if (session.autoStart) {
        this.eventEmitter.emit(PROCESSING_START_REQUESTED_EVENT, {
          domainKind: session.domainKind,
          sources,
          context: session.context,
        });
        return { accepted: true };
      }

      const expiresAt = new Date(
        Date.now() + DEFAULT_UPLOAD_SESSION_TTL_SECONDS * 1000,
      );
      await this.uploadSessionStore.save({
        uploadSessionId,
        domainKind: session.domainKind,
        sources,
        expiresAt,
        context: session.context,
      });

      return { uploadSessionId };
    } catch (error) {
      await rollbackSavedPaths(savedPaths);
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error("Upload failed", error);
      throw new BadRequestException(
        error instanceof Error ? error.message : "Upload failed",
      );
    }
  }
}
