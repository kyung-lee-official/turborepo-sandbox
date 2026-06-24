import { Injectable, Logger } from "@nestjs/common";
import type { StartProcessingInput } from "../async-processing.types";
import { ActiveJobConflictError } from "../async-processing.types";
import { ProcessingOrchestratorService } from "../async-processing-core/processing-orchestrator.service";
import { mapSessionSourcesToStartInput } from "./map-session-sources-to-start-input";
import { processingStartRequestedSchema } from "./start-processing-input.schema";

@Injectable()
export class EventStartProcessingAdapter {
  private readonly logger = new Logger(EventStartProcessingAdapter.name);

  constructor(
    private readonly processingOrchestrator: ProcessingOrchestratorService,
  ) {}

  async handle(
    raw: unknown,
  ): Promise<{ jobId: string; manifestId: string } | void> {
    const input = this.normalizeAndValidateFromEvent(raw);
    try {
      return await this.processingOrchestrator.startProcessing(input);
    } catch (error) {
      if (error instanceof ActiveJobConflictError) {
        this.logger.warn(
          `Skipped autoStart for ${input.domainKind}: active job already running`,
        );
        return;
      }
      throw error;
    }
  }

  private normalizeAndValidateFromEvent(raw: unknown): StartProcessingInput {
    const payload = processingStartRequestedSchema.parse(raw);
    return {
      ...mapSessionSourcesToStartInput(payload.domainKind, payload.sources),
      context: payload.context,
    };
  }
}
