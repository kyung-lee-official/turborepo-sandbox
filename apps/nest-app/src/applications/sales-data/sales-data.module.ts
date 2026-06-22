import { Module } from "@nestjs/common";
import { SalesImportModule } from "./sales-import/sales-import.module";
import { SalesImportFixturesModule } from "./sales-import-fixtures/sales-import-fixtures.module";

/** Umbrella for sales-report import, fixtures, and related Nest surface. */
@Module({
  imports: [SalesImportFixturesModule, SalesImportModule],
  exports: [SalesImportFixturesModule, SalesImportModule],
})
export class SalesDataModule {}
