import { Module } from "@nestjs/common";
import { AsyncProcessingModule } from "@/async-processing/async-processing.module";
import { RedisModule } from "@/redis/redis.module";
import { AliyunOssPresignedPutService } from "./aliyun-oss-presigned-put.service";
import { CosScopedStsService } from "./cos-scoped-sts.service";
import { ObjectStoreUploadController } from "./object-store-upload.controller";
import { ObjectStoreUploadService } from "./object-store-upload.service";
import { PendingObjectUploadStore } from "./pending-object-upload.store";
import { S3PresignedPutService } from "./s3-presigned-put.service";

@Module({
  imports: [AsyncProcessingModule, RedisModule],
  controllers: [ObjectStoreUploadController],
  providers: [
    ObjectStoreUploadService,
    PendingObjectUploadStore,
    S3PresignedPutService,
    CosScopedStsService,
    AliyunOssPresignedPutService,
  ],
})
export class ObjectStoreUploadModule {}
