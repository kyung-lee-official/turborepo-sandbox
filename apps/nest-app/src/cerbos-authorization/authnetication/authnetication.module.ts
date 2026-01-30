import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/recipes/prisma/prisma.module";
import { AuthneticationController } from "./authnetication.controller";
import { AuthneticationService } from "./authnetication.service";
import { JwtGuard } from "./guards/jwt.guard";

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('SECRET'),
        signOptions: {
          expiresIn: '60m',
        },
      }),
    }),
  ],
  controllers: [AuthneticationController],
  providers: [AuthneticationService, JwtGuard],
  exports: [JwtGuard, JwtModule],
})
export class AuthneticationModule {}
