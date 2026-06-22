import { Module } from "@nestjs/common";
import { RedisModule } from "../../redis/redis.module";
import { AsyncProcessingCoreModule } from "../async-processing-core.module";
import { ApiStartProcessingAdapter } from "./api-start-processing.adapter";
import { EventStartProcessingAdapter } from "./event-start-processing.adapter";
import { ProcessingStartRequestedListener } from "./processing-start-requested.listener";
import { StartProcessingController } from "./start-processing.controller";
import { UploadSessionStore } from "./upload-session.store";

@Module({
  imports: [AsyncProcessingCoreModule, RedisModule],
  controllers: [StartProcessingController],
  providers: [
    UploadSessionStore,
    ApiStartProcessingAdapter,
    EventStartProcessingAdapter,
    ProcessingStartRequestedListener,
  ],
  exports: [UploadSessionStore],
})
export class StartProcessingAdaptersModule {}
