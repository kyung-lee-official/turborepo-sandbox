import { Module } from "@nestjs/common";
import { Import207ErrorXlsxModule } from "./import-207-error-xlsx/import-207-error-xlsx.module";
import { MockDataModule } from "./mock-data/mock-data.module";
import { ProgramLifecycleModule } from "./program-lifecycle/program-lifecycle.module";
import { ResendModule } from "./resend/resend.module";
import { SalesImportFixturesModule } from "./sales-import-fixtures/sales-import-fixtures.module";
import { UploadLargeJsonModule } from "./upload-large-json/upload-large-json.module";

@Module({
  imports: [
    ProgramLifecycleModule,
    MockDataModule,
    ResendModule,
    UploadLargeJsonModule,
    SalesImportFixturesModule,
    Import207ErrorXlsxModule,
  ],
  exports: [
    ProgramLifecycleModule,
    MockDataModule,
    ResendModule,
    UploadLargeJsonModule,
    SalesImportFixturesModule,
    Import207ErrorXlsxModule,
  ],
})
export class ApplicationsModule {}
