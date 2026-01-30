import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TencentCosObjectsController } from "./tencent-cos-objects.controller";
import { TencentCosObjectsService } from "./tencent-cos-objects.service";

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [TencentCosObjectsController],
  providers: [TencentCosObjectsService],
})
export class TencentCosObjectsModule {}
