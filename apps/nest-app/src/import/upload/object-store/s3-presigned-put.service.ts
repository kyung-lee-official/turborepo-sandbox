import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DEFAULT_OBJECT_UPLOAD_PREFIX,
  S3_BUCKET_ENV,
  S3_UPLOAD_PREFIX_ENV,
} from "./object-store-upload.constants";

const PRESIGNED_PUT_EXPIRES_SECONDS = 3600;

@Injectable()
export class S3PresignedPutService {
  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>("AWS_REGION") ?? "us-east-1",
    });
  }

  getBucket(): string {
    const bucket = this.configService.get<string>(S3_BUCKET_ENV);
    if (!bucket) {
      throw new InternalServerErrorException(`${S3_BUCKET_ENV} is required`);
    }
    return bucket;
  }

  getUploadPrefix(): string {
    return (
      this.configService.get<string>(S3_UPLOAD_PREFIX_ENV) ??
      DEFAULT_OBJECT_UPLOAD_PREFIX
    );
  }

  async createPresignedPut(input: { key: string; mimeType?: string }): Promise<{
    bucket: string;
    presignedPutUrl: string;
    requiredHeaders?: { "Content-Type"?: string };
  }> {
    const bucket = this.getBucket();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      ...(input.mimeType ? { ContentType: input.mimeType } : {}),
    });
    const presignedPutUrl = await getSignedUrl(
      // Workspace hoists can split @smithy/types across client-s3 and presigner.
      this.s3Client as never,
      command as never,
      {
        expiresIn: PRESIGNED_PUT_EXPIRES_SECONDS,
      },
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
