import { Module } from "@nestjs/common";
import { GenerateLargeExcelService } from "./services/generate-large-excel.service";
import { UploadLargeXlsxController } from "./upload-large-xlsx.controller";

@Module({
  controllers: [UploadLargeXlsxController],
  providers: [GenerateLargeExcelService],
})
export class UploadLargeXlsxModule {}
