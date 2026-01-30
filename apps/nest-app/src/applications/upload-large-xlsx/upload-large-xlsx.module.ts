import { Module } from "@nestjs/common";
import { PrismaModule } from "../../recipes/prisma/prisma.module";
import { RedisModule } from "../../redis/redis.module";
import { FileProcessingProcessor } from "./processors/file-processing.processor";
import { SavingProcessor } from "./processors/saving.processor";
import { ValidatingProcessor } from "./processors/validating.processor";
import { BullQueueService } from "./services/bull-queue.service";
import { RedisStorageService } from "./services/redis-storage.service";
import { UploadLargeXlsxController } from "./upload-large-xlsx.controller";
import { UploadLargeXlsxGateway } from "./upload-large-xlsx.gateway";
import { UploadLargeXlsxService } from "./upload-large-xlsx.service";

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [UploadLargeXlsxController],
  providers: [
    UploadLargeXlsxService,
    UploadLargeXlsxGateway,
    RedisStorageService,
    BullQueueService,
    FileProcessingProcessor,
    ValidatingProcessor,
    SavingProcessor,
  ],
  exports: [UploadLargeXlsxService],
})
export class UploadLargeXlsxModule {}
