import { createReadStream, promises as fs } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import COS = require("cos-nodejs-sdk-v5");
import OSS = require("ali-oss");

import type {
  SourceLocator,
  VerifiedSourceLocator,
} from "../async-processing.types";

@Injectable()
export class ProcessingSourceReader {
  private readonly s3Client: S3Client;
  private readonly cosClient: COS;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>("AWS_REGION") ?? "us-east-1",
    });

    const secretId = this.configService.get<string>("SECRET_ID");
    const secretKey = this.configService.get<string>("SECRET_KEY");
    if (!secretId || !secretKey) {
      throw new InternalServerErrorException(
        "SECRET_ID and SECRET_KEY are required for COS source reads",
      );
    }

    this.cosClient = new COS({
      SecretId: secretId,
      SecretKey: secretKey,
    });
  }

  async verifyLocator(locator: SourceLocator): Promise<VerifiedSourceLocator> {
    switch (locator.kind) {
      case "local": {
        const fileStat = await stat(locator.path);
        if (!fileStat.isFile()) {
          throw new Error(`Local path is not a file: ${locator.path}`);
        }
        return {
          ...locator,
          sizeBytes: fileStat.size,
        };
      }
      case "object": {
        switch (locator.provider) {
          case "s3": {
            const head = await this.s3Client.send(
              new HeadObjectCommand({
                Bucket: locator.bucket,
                Key: locator.key,
              }),
            );
            return {
              ...locator,
              sizeBytes: head.ContentLength ?? 0,
              etag: head.ETag,
            };
          }
          case "cos": {
            const head = await this.headCosObject(
              locator.bucket,
              locator.key,
              this.getCosRegion(),
            );
            return {
              ...locator,
              sizeBytes: head.contentLength,
              etag: head.etag,
            };
          }
          case "aliyun": {
            const head = await this.headAliyunObject(locator.key);
            return {
              ...locator,
              sizeBytes: head.contentLength,
              etag: head.etag,
            };
          }
          default: {
            const _exhaustive: never = locator.provider;
            return _exhaustive;
          }
        }
      }
      default: {
        const _exhaustive: never = locator;
        return _exhaustive;
      }
    }
  }

  async openReadStream(locator: VerifiedSourceLocator): Promise<Readable> {
    switch (locator.kind) {
      case "local":
        return createReadStream(locator.path);
      case "object": {
        switch (locator.provider) {
          case "s3": {
            const response = await this.s3Client.send(
              new GetObjectCommand({
                Bucket: locator.bucket,
                Key: locator.key,
              }),
            );
            if (!response.Body) {
              throw new Error(`S3 object body missing: ${locator.key}`);
            }
            return response.Body as Readable;
          }
          case "cos":
            return this.getCosReadStream(
              locator.bucket,
              locator.key,
              this.getCosRegion(),
            );
          case "aliyun":
            return this.getAliyunReadStream(locator.key);
          default: {
            const _exhaustive: never = locator.provider;
            return _exhaustive;
          }
        }
      }
      default: {
        const _exhaustive: never = locator;
        return _exhaustive;
      }
    }
  }

  async deleteLocator(locator: SourceLocator): Promise<void> {
    switch (locator.kind) {
      case "local":
        await fs.unlink(locator.path);
        return;
      case "object": {
        switch (locator.provider) {
          case "s3":
            await this.s3Client.send(
              new DeleteObjectCommand({
                Bucket: locator.bucket,
                Key: locator.key,
              }),
            );
            return;
          case "cos":
            await this.deleteCosObject(
              locator.bucket,
              locator.key,
              this.getCosRegion(),
            );
            return;
          case "aliyun":
            await this.deleteAliyunObject(locator.key);
            return;
          default: {
            const _exhaustive: never = locator.provider;
            return _exhaustive;
          }
        }
      }
      default: {
        const _exhaustive: never = locator;
        return _exhaustive;
      }
    }
  }

  private getCosRegion(): string {
    const region = this.configService.get<string>("REGION");
    if (!region) {
      throw new InternalServerErrorException("REGION is required for COS");
    }
    return region;
  }

  private headCosObject(
    bucket: string,
    key: string,
    region: string,
  ): Promise<{ contentLength: number; etag?: string }> {
    return new Promise((resolve, reject) => {
      this.cosClient.headObject(
        { Bucket: bucket, Region: region, Key: key },
        (error, data) => {
          if (error) {
            reject(error);
            return;
          }
          const headers = data.headers ?? {};
          resolve({
            contentLength: headers["content-length"]
              ? Number(headers["content-length"])
              : 0,
            etag: headers.etag,
          });
        },
      );
    });
  }

  private getCosReadStream(
    bucket: string,
    key: string,
    region: string,
  ): Promise<Readable> {
    return new Promise((resolve, reject) => {
      this.cosClient.getObject(
        { Bucket: bucket, Region: region, Key: key },
        (error, data) => {
          if (error) {
            reject(error);
            return;
          }
          const body = data.Body;
          if (body instanceof Readable) {
            resolve(body);
            return;
          }
          if (Buffer.isBuffer(body)) {
            resolve(Readable.from(body));
            return;
          }
          reject(new Error(`Unexpected COS body type for key ${key}`));
        },
      );
    });
  }

  private deleteCosObject(
    bucket: string,
    key: string,
    region: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cosClient.deleteObject(
        { Bucket: bucket, Region: region, Key: key },
        (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });
  }

  private createAliyunClient(): OSS {
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
        "ALIYUN_OSS_ACCESS_KEY_ID, ALIYUN_OSS_ACCESS_SECRET, ALIYUN_OSS_REGION, and ALIYUN_OSS_BUCKET are required for Aliyun OSS source reads",
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

  private async headAliyunObject(
    key: string,
  ): Promise<{ contentLength: number; etag?: string }> {
    const client = this.createAliyunClient();
    const result = await client.head(key);
    const headers = result.res.headers as Record<string, string | undefined>;
    return {
      contentLength: headers["content-length"]
        ? Number(headers["content-length"])
        : 0,
      etag: headers.etag,
    };
  }

  private async getAliyunReadStream(key: string): Promise<Readable> {
    const client = this.createAliyunClient();
    const result = await client.getStream(key);
    return result.stream;
  }

  private async deleteAliyunObject(key: string): Promise<void> {
    const client = this.createAliyunClient();
    await client.delete(key);
  }
}
