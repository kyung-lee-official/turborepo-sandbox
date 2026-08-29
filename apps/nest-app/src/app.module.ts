import { BullModule } from "@nestjs/bullmq";
import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ApplicationsModule } from "./applications/applications.module";
import { TestMiddleware } from "./overview/middleware/test.middleware";
import { OverviewModule } from "./overview/overview.module";
import { PrismaModule } from "./recipes/prisma/prisma.module";
import { WebsocketsModule } from "./websockets/websockets.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    OverviewModule,
    PrismaModule,
    WebsocketsModule,
    ApplicationsModule,
    EventEmitterModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("REDIS_HOST"),
          port: Number(configService.get<string>("REDIS_PORT")),
        },
      }),
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
