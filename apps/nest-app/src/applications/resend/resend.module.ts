import { Module } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ResendController } from "./resend.controller";
import { ResendService } from "./resend.service";

@ApiTags("resend")
@Module({
  controllers: [ResendController],
  providers: [ResendService],
})
export class ResendModule {}
