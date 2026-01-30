import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/recipes/prisma/prisma.module";
import { AuthneticationController } from "./authnetication.controller";
import { AuthneticationService } from "./authnetication.service";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: process.env.SECRET,
      signOptions: {
        expiresIn: "60m",
      },
    }),
  ],
  controllers: [AuthneticationController],
  providers: [AuthneticationService],
})
export class AuthneticationModule {}
