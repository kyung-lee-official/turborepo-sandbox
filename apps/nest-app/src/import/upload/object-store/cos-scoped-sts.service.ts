import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type CredentialData, getCredential } from "qcloud-cos-sts";
import {
  COS_UPLOAD_PREFIX_ENV,
  DEFAULT_OBJECT_UPLOAD_PREFIX,
} from "./object-store-upload.constants";

const STS_DURATION_SECONDS = 3600;

@Injectable()
export class CosScopedStsService {
  constructor(private readonly configService: ConfigService) {}

  getUploadPrefix(): string {
    return (
      this.configService.get<string>(COS_UPLOAD_PREFIX_ENV) ??
      DEFAULT_OBJECT_UPLOAD_PREFIX
    );
  }

  async issueScopedCredential(uploadSessionId: string): Promise<{
    credential: CredentialData;
    region: string;
    bucket: string;
  }> {
    const secretId = this.configService.get<string>("SECRET_ID");
    const secretKey = this.configService.get<string>("SECRET_KEY");
    const bucket = this.configService.get<string>("BUCKET");
    const region = this.configService.get<string>("REGION");

    if (!secretId || !secretKey || !bucket || !region) {
      throw new InternalServerErrorException(
        "SECRET_ID, SECRET_KEY, BUCKET, and REGION are required for COS direct upload",
      );
    }

    const uploadPrefix = this.getUploadPrefix().replace(/\/+$/, "");
    const sessionPrefix = `${uploadPrefix}/${uploadSessionId}/`;
    const shortBucketName = bucket.split("-")[0];
    const appId = bucket.split("-")[1];
    if (!shortBucketName || !appId) {
      throw new InternalServerErrorException(
        "BUCKET must use {name}-{appId} format for COS STS policy",
      );
    }

    const policy = {
      version: "2.0",
      statement: [
        {
          action: [
            "name/cos:PutObject",
            "name/cos:InitiateMultipartUpload",
            "name/cos:ListMultipartUploads",
            "name/cos:ListParts",
            "name/cos:UploadPart",
            "name/cos:CompleteMultipartUpload",
          ],
          effect: "allow",
          principal: { qcs: ["*"] },
          resource: [
            `qcs::cos:${region}:uid/${appId}:prefix//${appId}/${shortBucketName}/${sessionPrefix}*`,
          ],
        },
      ],
    };

    const credential = await getCredential({
      secretId,
      secretKey,
      proxy: "",
      durationSeconds: STS_DURATION_SECONDS,
      policy,
    });

    return { credential, region, bucket };
  }
}
