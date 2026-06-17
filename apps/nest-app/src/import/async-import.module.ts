import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { AsyncImportController } from "./transport/async-import.controller";
import { ASYNC_IMPORT_QUEUE } from "./transport/async-import.types";
import { ImportProcessor } from "./transport/import.processor";
import { ImportJobProgressSseService } from "./transport/import-job-progress-sse.service";
import { ImportJobStoreService } from "./transport/import-job-store.service";
import { ImportRegistry } from "./transport/import-registry";
import { ImportTransportService } from "./transport/import-transport.service";

@Module({
  imports: [
    RedisModule,
    BullModule.registerQueue({
      name: ASYNC_IMPORT_QUEUE,
    }),
  ],
  controllers: [AsyncImportController],
  providers: [
    ImportRegistry,
    ImportJobStoreService,
    ImportJobProgressSseService,
    ImportTransportService,
    ImportProcessor,
  ],
  exports: [
    ImportRegistry,
    ImportTransportService,
    ImportJobStoreService,
    ImportJobProgressSseService,
  ],
})
export class AsyncImportModule {}
