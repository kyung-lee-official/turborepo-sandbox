import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ProcessingErrorBlobStore {
  private readonly baseDir: string;

  constructor(configService: ConfigService) {
    this.baseDir =
      configService.get<string>("PROCESSING_ERROR_BLOB_DIR") ??
      join(process.cwd(), "uploads", "processing-errors");
  }

  async putErrorBlob(jobId: string, blob: Buffer): Promise<string> {
    await mkdir(this.baseDir, { recursive: true });
    const storageKey = `processing-errors/${jobId}.xlsx`;
    const absolutePath = join(this.baseDir, `${jobId}.xlsx`);
    await writeFile(absolutePath, blob);
    return storageKey;
  }

  async getErrorBlob(jobId: string): Promise<Buffer | null> {
    const absolutePath = join(this.baseDir, `${jobId}.xlsx`);
    try {
      return await readFile(absolutePath);
    } catch {
      return null;
    }
  }
}
