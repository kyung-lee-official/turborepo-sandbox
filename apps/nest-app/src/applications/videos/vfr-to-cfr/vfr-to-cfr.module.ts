import { Module } from "@nestjs/common";
import { VfrToCfrController } from "./vfr-to-cfr.controller";
import { VfrToCfrService } from "./vfr-to-cfr.service";

@Module({
  controllers: [VfrToCfrController],
  providers: [VfrToCfrService],
})
export class VfrToCfrModule {}
