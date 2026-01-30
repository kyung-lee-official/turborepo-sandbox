import { Module } from "@nestjs/common";
import { TestGuard } from "./guards/test.guard";
import { OverviewController } from "./overview.controller";
import { OverviewService } from "./overview.service";

@Module({
  controllers: [OverviewController],
  providers: [OverviewService, TestGuard],
})
export class OverviewModule {}
