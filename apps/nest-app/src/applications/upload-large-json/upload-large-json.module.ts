import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { MockDatabaseService } from "./mock-database.service";
import { UploadLargeJsonController } from "./upload-large-json.controller";
import { UploadLargeJsonGateway } from "./upload-large-json.gateway";
import { UploadLargeJsonService } from "./upload-large-json.service";
import { UploadLargeJsonQueueService } from "./upload-large-json-queue.service";
import { UploadLargeJsonWorkerService } from "./upload-large-json-worker.service";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "upload-large-json",
    }),
  ],
  controllers: [UploadLargeJsonController],
  providers: [
    UploadLargeJsonService,
    UploadLargeJsonQueueService,
    UploadLargeJsonWorkerService,
    UploadLargeJsonGateway,
    MockDatabaseService,
  ],
})
export class UploadLargeJsonModule {}
