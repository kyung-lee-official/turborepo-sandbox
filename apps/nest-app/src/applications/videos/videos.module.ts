import { Module } from "@nestjs/common";
import { VfrToCfrModule } from "./vfr-to-cfr/vfr-to-cfr.module";

/** Umbrella for video processing demos (VFR→CFR, etc.). */
@Module({
  imports: [VfrToCfrModule],
  exports: [VfrToCfrModule],
})
export class VideosModule {}
