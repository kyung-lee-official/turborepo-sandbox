import { Module } from "@nestjs/common";
import { AsyncProcessingCoreModule } from "./async-processing-core.module";
import { StartProcessingAdaptersModule } from "./start-processing-adapters/start-processing-adapters.module";

/** Umbrella module — import this once from AppModule. */
@Module({
  imports: [AsyncProcessingCoreModule, StartProcessingAdaptersModule],
  exports: [AsyncProcessingCoreModule, StartProcessingAdaptersModule],
})
export class AsyncProcessingModule {}
