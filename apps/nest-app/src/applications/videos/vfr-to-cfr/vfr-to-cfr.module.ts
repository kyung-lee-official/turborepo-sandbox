import type { OnModuleInit } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { AsyncProcessingModule } from "@/async-processing/async-processing.module";
import { DomainRegistry } from "@/async-processing/async-processing-core/domain-registry.service";
import {
  VFR_TO_CFR_DOMAIN_KIND,
  vfrToCfrSourceSpecs,
} from "./vfr-to-cfr.constants";
import { VfrToCfrController } from "./vfr-to-cfr.controller";
import { VfrToCfrService } from "./vfr-to-cfr.service";
import { VfrToCfrDomainRunner } from "./vfr-to-cfr-domain.runner";

@Module({
  imports: [AsyncProcessingModule],
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
    });
  }
}
