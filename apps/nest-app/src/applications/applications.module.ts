import { Module } from "@nestjs/common";
import { AliyunOssModule } from "./aliyun-oss/aliyun-oss.module";
import { AsyncGeneratePdfModule } from "./async-generate-pdf/async-generate-pdf.module";
import { MockDataModule } from "./mock-data/mock-data.module";
import { ProgramLifecycleModule } from "./program-lifecycle/program-lifecycle.module";
import { ResendModule } from "./resend/resend.module";
import { SalesDataModule } from "./sales-data/sales-data.module";
import { UploadLargeJsonModule } from "./upload-large-json/upload-large-json.module";
import { WorkerModule } from "./worker/worker.module";

@Module({
  imports: [
    ProgramLifecycleModule,
    MockDataModule,
    ResendModule,
    UploadLargeJsonModule,
    SalesDataModule,
    AliyunOssModule,
    AsyncGeneratePdfModule,
    WorkerModule,
  ],
  exports: [
    ProgramLifecycleModule,
    MockDataModule,
    ResendModule,
    UploadLargeJsonModule,
    SalesDataModule,
    AliyunOssModule,
    AsyncGeneratePdfModule,
    WorkerModule,
  ],
})
export class ApplicationsModule {}
