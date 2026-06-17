import { Module } from "@nestjs/common";
import { GenerateTestFixturesService } from "./services/generate-test-fixtures.service";
import { UploadLargeXlsxController } from "./upload-large-xlsx.controller";

@Module({
  controllers: [UploadLargeXlsxController],
  providers: [GenerateTestFixturesService],
})
export class UploadLargeXlsxModule {}
