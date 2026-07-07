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
  url: string;
};

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

  private createOssClient(): OSS {
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
      endpoint: `https://${region}.aliyuncs.com`,
    });
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

  async uploadStagingFiles(): Promise<UploadedStagingFile[]> {
    const pending = await this.listStagingFiles();
    if (pending.length === 0) {
      throw new BadRequestException(
        `No files in ${this.stagingDir}. Add a file and try again.`,
      );
    }

    const client = this.createOssClient();
    const uploaded: UploadedStagingFile[] = [];

    for (const file of pending) {
      const localPath = join(this.stagingDir, file.name);
      const objectKey = `nestjs-staging/${file.name}`;
      const result = await client.put(objectKey, localPath);
      uploaded.push({
        name: file.name,
        objectKey,
        url: result.url,
      });
    }

    return uploaded;
  }
}
