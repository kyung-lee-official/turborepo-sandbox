import { Module } from "@nestjs/common";
import { SalesImportFixturesController } from "./sales-import-fixtures.controller";
import { GenerateTestFixturesService } from "./services/generate-test-fixtures/generate-test-fixtures.service";

@Module({
  controllers: [SalesImportFixturesController],
  providers: [GenerateTestFixturesService],
})
export class SalesImportFixturesModule {}
