import { Module } from "@nestjs/common";
import { AsyncGeneratePdfController } from "./async-generate-pdf.controller";
import { AsyncGeneratePdfService } from "./async-generate-pdf.service";

@Module({
  controllers: [AsyncGeneratePdfController],
  providers: [AsyncGeneratePdfService],
  exports: [AsyncGeneratePdfService],
})
export class AsyncGeneratePdfModule {}
