import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import OSS = require("ali-oss");

import {
  ALIYUN_OSS_UPLOAD_PREFIX_ENV,
  DEFAULT_OBJECT_UPLOAD_PREFIX,
} from "./object-store-upload.constants";

const PRESIGNED_PUT_EXPIRES_SECONDS = 3600;

@Injectable()
export class AliyunOssPresignedPutService {
  constructor(private readonly configService: ConfigService) {}

  getUploadPrefix(): string {
    return (
      this.configService.get<string>(ALIYUN_OSS_UPLOAD_PREFIX_ENV) ??
      DEFAULT_OBJECT_UPLOAD_PREFIX
    );
  }

  private createClient(): OSS {
    const accessKeyId = this.configService.get<string>(
      "ALIYUN_OSS_ACCESS_KEY_ID",
    );
    const accessKeySecret = this.configService.get<string>(
      "ALIYUN_OSS_ACCESS_SECRET",
    );
    const region = this.configService.get<string>("ALIYUN_OSS_REGION");
    const bucket = this.configService.get<string>("ALIYUN_OSS_BUCKET");

    if (!accessKeyId || !accessKeySecret || !region || !bucket) {
      throw new InternalServerErrorException(
        "ALIYUN_OSS_ACCESS_KEY_ID, ALIYUN_OSS_ACCESS_SECRET, ALIYUN_OSS_REGION, and ALIYUN_OSS_BUCKET are required",
      );
    }

    return new OSS({
      accessKeyId,
      accessKeySecret,
      region,
      bucket,
      authorizationV4: true,
      endpoint: `https://${region}.aliyuncs.com`,
    });
  }

  getBucket(): string {
    const bucket = this.configService.get<string>("ALIYUN_OSS_BUCKET");
    if (!bucket) {
      throw new InternalServerErrorException("ALIYUN_OSS_BUCKET is required");
    }
    return bucket;
  }

  async createPresignedPut(input: { key: string; mimeType?: string }): Promise<{
    bucket: string;
    presignedPutUrl: string;
    requiredHeaders?: { "Content-Type"?: string };
  }> {
    const client = this.createClient();
    const bucket = this.getBucket();
    const presignedPutUrl = await client.signatureUrlV4(
      "PUT",
      PRESIGNED_PUT_EXPIRES_SECONDS,
      {
        headers: input.mimeType ? { "Content-Type": input.mimeType } : {},
      },
      input.key,
    );

    return {
      bucket,
      presignedPutUrl,
      ...(input.mimeType
        ? { requiredHeaders: { "Content-Type": input.mimeType } }
        : {}),
    };
  }
}
