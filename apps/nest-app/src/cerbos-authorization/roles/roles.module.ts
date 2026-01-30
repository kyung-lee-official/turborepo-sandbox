import { Module } from "@nestjs/common";
import { PrismaModule } from "@/recipes/prisma/prisma.module";
import { FindAllCerbosGuard } from "./guards/find-all.guard";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";

@Module({
  imports: [PrismaModule],
  controllers: [RolesController],
  providers: [RolesService, FindAllCerbosGuard],
})
export class RolesModule {}
