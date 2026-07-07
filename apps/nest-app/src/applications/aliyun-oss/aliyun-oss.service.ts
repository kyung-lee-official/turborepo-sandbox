import { mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import OSS = require("ali-oss");

export type StagingFile = {
  name: string;
  sizeBytes: number;
};

export type UploadedStagingFile = {
  name: string;
  objectKey: string;
  signedDownloadUrl: string;
};

export type OssBucketObject = {
  name: string;
  objectKey: string;
  sizeBytes: number;
  lastModified: string;
};

const NEST_TO_ALIYUN_OSS_PREFIX = "nest-to-aliyun-oss";
const SIGNED_DOWNLOAD_EXPIRES_SECONDS = 600;

@Injectable()
export class AliyunOssService {
  private readonly stagingDir = join(
    process.cwd(),
    "temp",
    "upload-to-aliyun-oss",
  );

  constructor(private readonly configService: ConfigService) {}

  getStagingDir(): string {
    return this.stagingDir;
  }

  private createOssClient(options?: { authorizationV4?: boolean }): OSS {
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
      ...(options?.authorizationV4 ? { authorizationV4: true } : {}),
      endpoint: `https://${region}.aliyuncs.com`,
    });
  }

  private createOssSigningClient(): OSS {
    return this.createOssClient({ authorizationV4: true });
  }

  private createOssApiClient(): OSS {
    return this.createOssClient();
  }

  private async listObjectsByPrefix(
    client: OSS,
    prefix: string,
    maxKeys: number,
    marker?: string,
  ): Promise<OSS.ListObjectResult> {
    const query: OSS.ListObjectsQuery = {
      prefix,
      "max-keys": maxKeys,
    };
    if (marker) {
      query.marker = marker;
    }
    return client.list(query, {});
  }

  private nestToAliyunOssPrefix(): string {
    return `${NEST_TO_ALIYUN_OSS_PREFIX}/`;
  }

  private objectKeyForStagingFile(fileName: string): string {
    return `${NEST_TO_ALIYUN_OSS_PREFIX}/${fileName}`;
  }

  private assertSignableObjectKey(objectKey: string): void {
    const prefix = this.nestToAliyunOssPrefix();
    if (!objectKey.startsWith(prefix) || objectKey.length <= prefix.length) {
      throw new BadRequestException(
        `objectKey must name an object under ${prefix}`,
      );
    }
  }

  async getSignedDownloadUrl(objectKey: string): Promise<string> {
    this.assertSignableObjectKey(objectKey);
    const client = this.createOssSigningClient();
    return client.signatureUrlV4(
      "GET",
      SIGNED_DOWNLOAD_EXPIRES_SECONDS,
      { headers: {} },
      objectKey,
    );
  }

  /** OSS has no real folders; ensure a zero-byte prefix marker exists when empty. */
  private async ensureNestToAliyunOssPrefix(client: OSS): Promise<void> {
    const prefix = this.nestToAliyunOssPrefix();
    const listResult = await this.listObjectsByPrefix(client, prefix, 1);

    const hasObjects =
      Array.isArray(listResult.objects) && listResult.objects.length > 0;
    const hasPrefixes =
      Array.isArray(listResult.prefixes) && listResult.prefixes.length > 0;
    if (hasObjects || hasPrefixes) {
      return;
    }

    await client.put(prefix, Buffer.alloc(0));
  }

  private async ensureStagingDir(): Promise<void> {
    await mkdir(this.stagingDir, { recursive: true });
  }

  async listStagingFiles(): Promise<StagingFile[]> {
    await this.ensureStagingDir();
    const entries = await readdir(this.stagingDir, { withFileTypes: true });
    const files: StagingFile[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      const filePath = join(this.stagingDir, entry.name);
      const fileStat = await stat(filePath);
      files.push({
        name: entry.name,
        sizeBytes: fileStat.size,
      });
    }

    return files.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Direct children of `nest-to-aliyun-oss/` only (no nested keys). */
  async listNestToAliyunOssObjects(): Promise<OssBucketObject[]> {
    const client = this.createOssApiClient();
    const prefix = this.nestToAliyunOssPrefix();
    const objects: OssBucketObject[] = [];
    let marker: string | undefined;

    do {
      const listResult = await this.listObjectsByPrefix(
        client,
        prefix,
        1000,
        marker,
      );

      for (const object of listResult.objects ?? []) {
        const objectKey = object.name;
        if (!objectKey || objectKey === prefix) {
          continue;
        }

        const nameFromPrefix = objectKey.slice(prefix.length);
        if (!nameFromPrefix || nameFromPrefix.includes("/")) {
          continue;
        }

        objects.push({
          name: nameFromPrefix,
          objectKey,
          sizeBytes: object.size,
          lastModified: object.lastModified,
        });
      }

      marker = listResult.isTruncated ? listResult.nextMarker : undefined;
    } while (marker);

    return objects.sort((a, b) => a.name.localeCompare(b.name));
  }

  async deleteNestToAliyunOssObject(objectKey: string): Promise<void> {
    this.assertSignableObjectKey(objectKey);
    const client = this.createOssApiClient();
    await client.delete(objectKey);
  }

  async uploadStagingFiles(): Promise<UploadedStagingFile[]> {
    const pending = await this.listStagingFiles();
    if (pending.length === 0) {
      throw new BadRequestException(
        `No files in ${this.stagingDir}. Add a file and try again.`,
      );
    }

    const client = this.createOssApiClient();
    await this.ensureNestToAliyunOssPrefix(client);
    const uploaded: UploadedStagingFile[] = [];

    for (const file of pending) {
      const localPath = join(this.stagingDir, file.name);
      const objectKey = this.objectKeyForStagingFile(file.name);
      await client.put(objectKey, localPath);
      const signedDownloadUrl = await this.getSignedDownloadUrl(objectKey);
      uploaded.push({
        name: file.name,
        objectKey,
        signedDownloadUrl,
      });
    }

    return uploaded;
  }
}
