import { Module } from "@nestjs/common";
import { PrismaModule } from "@/recipes/prisma/prisma.module";
import { ProgramLifecycleController } from "./program-lifecycle.controller";
import { ProgramLifecycleService } from "./program-lifecycle.service";

@Module({
  imports: [PrismaModule],
  controllers: [ProgramLifecycleController],
  providers: [ProgramLifecycleService],
})
export class ProgramLifecycleModule {}
