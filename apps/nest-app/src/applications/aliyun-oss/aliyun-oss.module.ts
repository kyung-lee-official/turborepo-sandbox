import { Module } from "@nestjs/common";
import { AliyunOssController } from "./aliyun-oss.controller";
import { AliyunOssService } from "./aliyun-oss.service";

@Module({
  controllers: [AliyunOssController],
  providers: [AliyunOssService],
  exports: [AliyunOssService],
})
export class AliyunOssModule {}
