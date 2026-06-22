import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EventStartProcessingAdapter } from "./event-start-processing.adapter";
import { PROCESSING_START_REQUESTED_EVENT } from "./upload-session.types";

@Injectable()
export class ProcessingStartRequestedListener {
  constructor(
    private readonly eventStartProcessingAdapter: EventStartProcessingAdapter,
  ) {}

  @OnEvent(PROCESSING_START_REQUESTED_EVENT)
  async onProcessingStartRequested(payload: unknown): Promise<void> {
    await this.eventStartProcessingAdapter.handle(payload);
  }
}
