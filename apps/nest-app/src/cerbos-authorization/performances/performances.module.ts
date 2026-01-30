import { Module } from "@nestjs/common";
import { PrismaModule } from "@/recipes/prisma/prisma.module";
import { PerformancesController } from "./performances.controller";
import { PerformancesService } from "./performances.service";

@Module({
  imports: [PrismaModule],
  controllers: [PerformancesController],
  providers: [PerformancesService],
})
export class PerformancesModule {}
