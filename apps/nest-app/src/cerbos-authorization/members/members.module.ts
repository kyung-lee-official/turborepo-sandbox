import { Module } from "@nestjs/common";
import { PrismaModule } from "@/recipes/prisma/prisma.module";
import { FindAllCerbosGuard } from "./guards/find-all.guard";
import { MembersController } from "./members.controller";
import { MembersService } from "./members.service";

@Module({
  imports: [PrismaModule],
  controllers: [MembersController],
  providers: [MembersService, FindAllCerbosGuard],
})
export class MembersModule {}
