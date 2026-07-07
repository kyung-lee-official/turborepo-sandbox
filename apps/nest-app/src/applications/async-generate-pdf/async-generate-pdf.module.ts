import type { OnModuleInit } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { AsyncProcessingModule } from "@/async-processing/async-processing.module";
import { DomainRegistry } from "@/async-processing/async-processing-core/domain-registry.service";
import { PrismaModule } from "@/recipes/prisma/prisma.module";
import {
  ASYNC_GENERATE_PDF_DOMAIN_KIND,
  asyncGeneratePdfSourceSpecs,
} from "./async-generate-pdf.constants";
import { AsyncGeneratePdfController } from "./async-generate-pdf.controller";
import { AsyncGeneratePdfService } from "./async-generate-pdf.service";
import { AsyncGeneratePdfDomainRunner } from "./async-generate-pdf-domain.runner";

@Module({
  imports: [AsyncProcessingModule, PrismaModule],
  controllers: [AsyncGeneratePdfController],
  providers: [AsyncGeneratePdfService, AsyncGeneratePdfDomainRunner],
  exports: [AsyncGeneratePdfService],
})
export class AsyncGeneratePdfModule implements OnModuleInit {
  constructor(
    private readonly domainRegistry: DomainRegistry,
    private readonly asyncGeneratePdfDomainRunner: AsyncGeneratePdfDomainRunner,
  ) {}

  onModuleInit(): void {
    this.domainRegistry.register(ASYNC_GENERATE_PDF_DOMAIN_KIND, {
      domainRunner: this.asyncGeneratePdfDomainRunner,
      sourceSpecs: [...asyncGeneratePdfSourceSpecs],
      lockPolicy: { type: "none" },
    });
  }
}
