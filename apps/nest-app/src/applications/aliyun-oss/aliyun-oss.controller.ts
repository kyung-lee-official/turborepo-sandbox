import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
} from "@nestjs/common";
import {
  AliyunOssService,
  type OssBucketObject,
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

  @Get("bucket")
  listNestToAliyunOssObjects(): Promise<{
    prefix: string;
    objects: OssBucketObject[];
  }> {
    return this.aliyunOssService
      .listNestToAliyunOssObjects()
      .then((objects) => ({
        prefix: "nest-to-aliyun-oss/",
        objects,
      }));
  }

  @Delete("bucket/object")
  async deleteNestToAliyunOssObject(
    @Body() body: { objectKey?: string },
  ): Promise<{ deleted: string }> {
    const objectKey = body.objectKey?.trim();
    if (!objectKey) {
      throw new BadRequestException("objectKey is required");
    }
    await this.aliyunOssService.deleteNestToAliyunOssObject(objectKey);
    return { deleted: objectKey };
  }

  @Post("staging/upload")
  uploadStagingFiles(): Promise<{ uploaded: UploadedStagingFile[] }> {
    return this.aliyunOssService
      .uploadStagingFiles()
      .then((uploaded) => ({ uploaded }));
  }

  @Post("download-signed-url")
  getDownloadSignedUrl(
    @Body() body: { objectKey?: string; fileName?: string },
  ): Promise<{ url: string }> {
    const objectKey = body.objectKey?.trim();
    if (!objectKey) {
      throw new BadRequestException("objectKey is required");
    }
    return this.aliyunOssService
      .getSignedDownloadUrl(objectKey, body.fileName?.trim())
      .then((url) => ({ url }));
  }
}
