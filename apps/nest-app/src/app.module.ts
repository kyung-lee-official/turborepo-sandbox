import { BullModule } from "@nestjs/bullmq";
import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ApplicationsModule } from "./applications/applications.module";
import { AssessmentsModule } from "./cerbos-authorization/assessments/assessments.module";
import { AuthneticationModule } from "./cerbos-authorization/authnetication/authnetication.module";
import { MembersModule } from "./cerbos-authorization/members/members.module";
import { PerformancesModule } from "./cerbos-authorization/performances/performances.module";
import { RolesModule } from "./cerbos-authorization/roles/roles.module";
import { TestMiddleware } from "./overview/middleware/test.middleware";
import { OverviewModule } from "./overview/overview.module";
import { PrismaModule } from "./recipes/prisma/prisma.module";
import { TechniquesModule } from "./techniques/techniques.module";
import { TencentCosObjectsModule } from "./tencent-cos-objects/tencent-cos-objects.module";
import { WebsocketsModule } from "./websockets/websockets.module";

@Module({
  imports: [
    OverviewModule,
    TechniquesModule,
    TencentCosObjectsModule,
    PrismaModule,
    WebsocketsModule,
    MembersModule,
    AuthneticationModule,
    RolesModule,
    PerformancesModule,
    AssessmentsModule,
    ApplicationsModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TestMiddleware).forRoutes("*");
  }
}
