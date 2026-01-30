import { statSync } from "node:fs";
import { open } from "node:fs/promises";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import * as COS from "cos-nodejs-sdk-v5";
import { type CredentialData, getCredential } from "qcloud-cos-sts";
import type { UpdateTencentCosObjectDto } from "./dto/update-tencent-cos-object.dto";

@Injectable()
export class TencentCosObjectsService {
  private cos: COS = new COS({
    SecretId: process.env.SECRET_ID,
    SecretKey: process.env.SECRET_KEY,
  });
  constructor() {}

  async getTemporaryCredential(): Promise<CredentialData> {
    const config = {
      secretId: process.env.SECRET_ID,
      secretKey: process.env.SECRET_KEY,
      proxy: "",
      host: "sts.tencentcloudapi.com",
      durationSeconds: 300,
      bucket: process.env.BUCKET,
      region: process.env.REGION,
      allowPrefix: "*",
    };
    if (!config.bucket) {
      throw new InternalServerErrorException("Bucket configuration is missing");
    }
    const shortBucketName = config.bucket.split("-")[0];
    const appId = config.bucket.split("-")[1];
    const policy = {
      version: "2.0",
      statement: [
        {
          action: [
            /* 列出对象 */
            "name/cos:GetBucket",
            /* 简单上传 */
            "name/cos:PutObject",
            /* 分片上传 */
            "name/cos:InitiateMultipartUpload",
            "name/cos:ListMultipartUploads",
            "name/cos:ListParts",
            "name/cos:UploadPart",
            "name/cos:CompleteMultipartUpload",
            /* 下载 */
            "name/cos:GetObject",
            /* 删除 */
            "name/cos:DeleteObject",
          ],
          effect: "allow",
          principal: { qcs: ["*"] },
          resource: [
            `qcs::cos:${config.region}:uid/${appId}:prefix//${appId}/${shortBucketName}/app/${config.allowPrefix}`,
          ],
        },
      ],
    };
    try {
      if (!config.secretId || !config.secretKey) {
        throw new InternalServerErrorException(
          "SecretId or SecretKey is missing",
        );
      }
      const credentialData = await getCredential({
        secretId: config.secretId,
        secretKey: config.secretKey,
        proxy: config.proxy,
        durationSeconds: config.durationSeconds,
        policy: policy,
      });
      return credentialData;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * Uploads a file to tencent COS
   * @deprecated uploadFile is deprecated.
   * 		This method upload the file to our backend server first,
   * 		then the server upload the file to Tencent COS. The drawback
   * 		is that the file is uploaded twice, and the client can't get
   * 		the upload progress.
   * 		The recommended method is to issue a temporary credential to the frontend,
   * 		and then the frontend uploads the file to tencent COS directly.
   * @param file the file to upload to tencent COS
   * @returns the result of the upload
   */
  async uploadFileToCos(
    file: Express.Multer.File,
  ): Promise<COS.PutObjectResult> {
    try {
      const fileHandle = await open(
        "uploads/SampleVideo_1280x720_10mb.mp4",
        "r",
      );
      const stream = fileHandle.createReadStream();
      const length = statSync("uploads/SampleVideo_1280x720_10mb.mp4").size;

      const key = await import("nanoid");
      const res = await this.cos.putObject({
        Bucket: process.env.BUCKET as string,
        Region: process.env.REGION as string,
        Key: key + ".mp4",
        Body: stream as COS.UploadBody,
        ContentLength: length,
        onProgress: (progressData: any) => {
          console.log(JSON.stringify(progressData));
        },
      });
      return res;
    } catch (error) {
      throw error;
    }
  }

  findAll() {
    return `This action returns all tencentCosObjects`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tencentCosObject`;
  }

  update(id: number, updateTencentCosObjectDto: UpdateTencentCosObjectDto) {
    return `This action updates a #${id} tencentCosObject`;
  }

  remove(id: number) {
    return `This action removes a #${id} tencentCosObject`;
  }
}
