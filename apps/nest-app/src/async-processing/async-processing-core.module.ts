import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../recipes/prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { ASYNC_PROCESSING_QUEUE } from "./async-processing.types";
import { DomainRegistry } from "./domain-registry.service";
import { ProcessingController } from "./processing.controller";
import { ProcessingProcessor } from "./processing.processor";
import { ProcessingActiveJobLock } from "./processing-active-job.lock";
import { ProcessingErrorBlobStore } from "./processing-error-blob.store";
import { ProcessingJobRepository } from "./processing-job.repository";
import { ProcessingOrchestratorService } from "./processing-orchestrator.service";
import { ProcessingProgressPublisher } from "./processing-progress-publisher.service";
import { ProcessingProgressSseService } from "./processing-progress-sse.service";
import { ProcessingSourceReader } from "./processing-source.reader";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue({ name: ASYNC_PROCESSING_QUEUE }),
  ],
  controllers: [ProcessingController],
  providers: [
    ProcessingOrchestratorService,
    ProcessingJobRepository,
    ProcessingSourceReader,
    ProcessingErrorBlobStore,
    ProcessingActiveJobLock,
    ProcessingProgressPublisher,
    ProcessingProgressSseService,
    ProcessingProcessor,
    DomainRegistry,
  ],
  exports: [
    ProcessingOrchestratorService,
    DomainRegistry,
    ProcessingJobRepository,
  ],
})
export class AsyncProcessingCoreModule {}
