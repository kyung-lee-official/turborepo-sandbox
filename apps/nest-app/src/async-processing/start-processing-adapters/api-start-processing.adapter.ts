import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ActiveJobConflictError } from "../async-processing.types";
import { ProcessingOrchestratorService } from "../async-processing-core/processing-orchestrator.service";
import { mapSessionSourcesToStartInput } from "./map-session-sources-to-start-input";
import { startApiBodySchema } from "./start-processing-input.schema";
import { UploadSessionStore } from "./upload-session.store";

@Injectable()
export class ApiStartProcessingAdapter {
  constructor(
    private readonly uploadSessionStore: UploadSessionStore,
    private readonly processingOrchestrator: ProcessingOrchestratorService,
  ) {}

  async handle(raw: unknown): Promise<{ jobId: string; manifestId: string }> {
    const body = startApiBodySchema.parse(raw);
    const session = await this.uploadSessionStore.get(body.uploadSessionId);
    if (!session) {
      throw new NotFoundException("Upload session expired or unknown");
    }

    if (body.domainKind && body.domainKind !== session.domainKind) {
      throw new BadRequestException(
        `domainKind does not match session: expected ${session.domainKind}`,
      );
    }

    if (session.startedJobId && session.startedManifestId) {
      return {
        jobId: session.startedJobId,
        manifestId: session.startedManifestId,
      };
    }

    const input = mapSessionSourcesToStartInput(
      session.domainKind,
      session.sources,
    );

    try {
      const result = await this.processingOrchestrator.startProcessing(input);
      await this.uploadSessionStore.consume(body.uploadSessionId);
      return result;
    } catch (error) {
      if (error instanceof ActiveJobConflictError) {
        throw new ConflictException({
          code: "PROCESSING_ACTIVE_JOB",
          message: `A processing job is already active for domainKind ${input.domainKind}`,
        });
      }
      throw error;
    }
  }
}
