import { Module } from "@nestjs/common";
import { Import207ErrorXlsxController } from "./import-207-error-xlsx.controller";
import { Import207ErrorXlsxService } from "./import-207-error-xlsx.service";

@Module({
  controllers: [Import207ErrorXlsxController],
  providers: [Import207ErrorXlsxService],
  exports: [Import207ErrorXlsxService],
})
export class Import207ErrorXlsxModule {}
