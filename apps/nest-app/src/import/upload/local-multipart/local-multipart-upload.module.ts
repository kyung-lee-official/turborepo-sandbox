import { Module } from "@nestjs/common";
import { AsyncProcessingModule } from "@/async-processing/async-processing.module";
import { LocalMultipartUploadController } from "./local-multipart-upload.controller";
import { LocalMultipartUploadService } from "./local-multipart-upload.service";

@Module({
  imports: [AsyncProcessingModule],
  controllers: [LocalMultipartUploadController],
  providers: [LocalMultipartUploadService],
})
export class LocalMultipartUploadModule {}
