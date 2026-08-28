import { Module } from "@nestjs/common";
import { AsyncGeneratePdfModule } from "./async-generate-pdf/async-generate-pdf.module";
import { ProgramLifecycleModule } from "./program-lifecycle/program-lifecycle.module";
import { ResendModule } from "./resend/resend.module";
import { SalesDataModule } from "./sales-data/sales-data.module";
import { UploadLargeJsonModule } from "./upload-large-json/upload-large-json.module";
import { VideosModule } from "./videos/videos.module";

@Module({
  imports: [
    ProgramLifecycleModule,
    ResendModule,
    UploadLargeJsonModule,
    SalesDataModule,
    AsyncGeneratePdfModule,
    VideosModule,
  ],
  exports: [
    ProgramLifecycleModule,
    ResendModule,
    UploadLargeJsonModule,
    SalesDataModule,
    AsyncGeneratePdfModule,
    VideosModule,
  ],
})
export class ApplicationsModule {}
