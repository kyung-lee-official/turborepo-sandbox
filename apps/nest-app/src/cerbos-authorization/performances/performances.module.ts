import { Module } from "@nestjs/common";
import { PrismaModule } from "@/recipes/prisma/prisma.module";
import { AuthneticationModule } from "../authnetication/authnetication.module";
import { DeleteCerbosGuard } from "./guards/delete.guard";
import { GetCerbosGuard } from "./guards/get.guard";
import { PerformancesController } from "./performances.controller";
import { PerformancesService } from "./performances.service";

@Module({
  imports: [PrismaModule, AuthneticationModule],
  controllers: [PerformancesController],
  providers: [PerformancesService, DeleteCerbosGuard, GetCerbosGuard],
})
export class PerformancesModule {}
