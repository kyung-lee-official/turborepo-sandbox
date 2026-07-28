import type { OnModuleInit } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { AsyncProcessingModule } from "@/async-processing/async-processing.module";
import { DomainRegistry } from "@/async-processing/async-processing-core/domain-registry.service";
import { LocalMultipartUploadModule } from "@/import/upload/local-multipart/local-multipart-upload.module";
import { PrismaModule } from "@/recipes/prisma/prisma.module";
import {
  VFR_TO_CFR_DOMAIN_KIND,
  vfrToCfrSourceSpecs,
  vfrToCfrUploadPolicy,
} from "./vfr-to-cfr.constants";
import { VfrToCfrController } from "./vfr-to-cfr.controller";
import { VfrToCfrService } from "./vfr-to-cfr.service";
import { VfrToCfrDomainRunner } from "./vfr-to-cfr-domain.runner";

@Module({
  imports: [AsyncProcessingModule, LocalMultipartUploadModule, PrismaModule],
  controllers: [VfrToCfrController],
  providers: [VfrToCfrService, VfrToCfrDomainRunner],
})
export class VfrToCfrModule implements OnModuleInit {
  constructor(
    private readonly domainRegistry: DomainRegistry,
    private readonly vfrToCfrDomainRunner: VfrToCfrDomainRunner,
  ) {}

  onModuleInit(): void {
    this.domainRegistry.register(VFR_TO_CFR_DOMAIN_KIND, {
      domainRunner: this.vfrToCfrDomainRunner,
      sourceSpecs: [...vfrToCfrSourceSpecs],
      lockPolicy: { type: "none" },
      upload: vfrToCfrUploadPolicy,
    });
  }
}
