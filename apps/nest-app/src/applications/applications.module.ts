import { Module } from "@nestjs/common";
import { ProgramLifecycleModule } from "./program-lifecycle/program-lifecycle.module";
import { ResendModule } from "./resend/resend.module";
import { UploadLargeJsonModule } from "./upload-large-json/upload-large-json.module";
import { VideosModule } from "./videos/videos.module";

@Module({
  imports: [
    ProgramLifecycleModule,
    ResendModule,
    UploadLargeJsonModule,
    VideosModule,
  ],
  exports: [
    ProgramLifecycleModule,
    ResendModule,
    UploadLargeJsonModule,
    VideosModule,
  ],
})
export class ApplicationsModule {}
