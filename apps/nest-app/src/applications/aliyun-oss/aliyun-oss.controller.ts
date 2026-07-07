import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from "@nestjs/common";
import {
  AliyunOssService,
  type StagingFile,
  type UploadedStagingFile,
} from "./aliyun-oss.service";

@Controller("aliyun-oss")
export class AliyunOssController {
  constructor(private readonly aliyunOssService: AliyunOssService) {}

  @Get("staging")
  listStagingFiles(): Promise<{
    stagingDir: string;
    files: StagingFile[];
  }> {
    return this.aliyunOssService.listStagingFiles().then((files) => ({
      stagingDir: this.aliyunOssService.getStagingDir(),
      files,
    }));
  }

  @Post("staging/upload")
  uploadStagingFiles(): Promise<{ uploaded: UploadedStagingFile[] }> {
    return this.aliyunOssService
      .uploadStagingFiles()
      .then((uploaded) => ({ uploaded }));
  }

  @Post("download-signed-url")
  getDownloadSignedUrl(
    @Body() body: { objectKey?: string },
  ): Promise<{ url: string }> {
    const objectKey = body.objectKey?.trim();
    if (!objectKey) {
      throw new BadRequestException("objectKey is required");
    }
    return this.aliyunOssService
      .getSignedDownloadUrl(objectKey)
      .then((url) => ({ url }));
  }
}
