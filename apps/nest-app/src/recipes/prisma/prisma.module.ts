import { Module } from "@nestjs/common";
import { BigIntService } from "./bigint.service";
import { CategoriesService } from "./categories.service";
import { EventsService } from "./events.service";
import { GroupsService } from "./groups.service";
import { OrderService } from "./order.service";
import { PostsService } from "./posts.service";
import { PrismaController } from "./prisma.controller";
import { PrismaService } from "./prisma.service";
import { UsersService } from "./users.service";

@Module({
  controllers: [PrismaController],
  providers: [
    PrismaService,
    UsersService,
    PostsService,
    CategoriesService,
    EventsService,
    GroupsService,
    BigIntService,
    OrderService,
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
