import type { OnModuleInit } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { AsyncProcessingModule } from "@/async-processing/async-processing.module";
import { DomainRegistry } from "@/async-processing/async-processing-core/domain-registry.service";
import { PrismaModule } from "@/recipes/prisma/prisma.module";
import {
  SALES_IMPORT_DOMAIN_KIND,
  salesImportSourceSpecs,
  salesImportUploadPolicy,
} from "./sales-import.constants";
import { SalesImportDomainRunner } from "./sales-import-domain.runner";

@Module({
  imports: [AsyncProcessingModule, PrismaModule],
  providers: [SalesImportDomainRunner],
})
export class SalesImportModule implements OnModuleInit {
  constructor(
    private readonly domainRegistry: DomainRegistry,
    private readonly salesImportDomainRunner: SalesImportDomainRunner,
  ) {}

  onModuleInit(): void {
    this.domainRegistry.register(SALES_IMPORT_DOMAIN_KIND, {
      domainRunner: this.salesImportDomainRunner,
      sourceSpecs: [...salesImportSourceSpecs],
      lockPolicy: { type: "global_singleton" },
      upload: salesImportUploadPolicy,
    });
  }
}
