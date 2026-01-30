import { Module } from "@nestjs/common";
import { MockDataModule } from "./mock-data/mock-data.module";
import { ProgramLifecycleModule } from "./program-lifecycle/program-lifecycle.module";
import { ResendModule } from "./resend/resend.module";
import { UploadLargeJsonModule } from "./upload-large-json/upload-large-json.module";
import { UploadLargeXlsxModule } from "./upload-large-xlsx/upload-large-xlsx.module";

@Module({
  imports: [
    ProgramLifecycleModule,
    MockDataModule,
    ResendModule,
    UploadLargeJsonModule,
    UploadLargeXlsxModule,
  ],
  exports: [
    ProgramLifecycleModule,
    MockDataModule,
    ResendModule,
    UploadLargeJsonModule,
    UploadLargeXlsxModule,
  ],
})
export class ApplicationsModule {}
