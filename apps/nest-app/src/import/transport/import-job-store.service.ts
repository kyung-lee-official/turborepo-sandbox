import { Injectable } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";
import type { ImportUpload, JobMeta } from "./async-import.types";

const KEY_PREFIX = "async-import";
const UPLOAD_TTL_SECONDS = 60 * 60;
const META_TTL_SECONDS = 60 * 60 * 24;
const ERROR_BLOB_TTL_SECONDS = 60 * 60 * 24;
const ACTIVE_JOB_TTL_SECONDS = 60 * 60 * 24;

@Injectable()
export class ImportJobStoreService {
  constructor(private readonly redisService: RedisService) {}

  private metaKey(jobId: string) {
    return `${KEY_PREFIX}:meta:${jobId}`;
  }

  private uploadKey(jobId: string, uploadSlotId: string) {
    return `${KEY_PREFIX}:upload:${jobId}:${uploadSlotId}`;
  }

  private errorBlobKey(jobId: string) {
    return `${KEY_PREFIX}:error-blob:${jobId}`;
  }

  private activeJobKey(importKind: string) {
    return `${KEY_PREFIX}:active:${importKind}`;
  }

  async saveMeta(meta: JobMeta): Promise<void> {
    const client = this.redisService.getClient();
    await client.set(
      this.metaKey(meta.jobId),
      JSON.stringify(meta),
      "EX",
      META_TTL_SECONDS,
    );
  }

  async getMetaByJobId(jobId: string): Promise<JobMeta | null> {
    const client = this.redisService.getClient();
    const raw = await client.get(this.metaKey(jobId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as JobMeta;
  }

  async patchMetaByJobId(
    jobId: string,
    patch: Partial<JobMeta>,
  ): Promise<JobMeta | null> {
    const current = await this.getMetaByJobId(jobId);
    if (!current) {
      return null;
    }
    const next: JobMeta = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.saveMeta(next);
    return next;
  }

  async saveUpload(
    jobId: string,
    upload: ImportUpload,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const payload = JSON.stringify({
      uploadSlotId: upload.uploadSlotId,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      buffer: upload.buffer.toString("base64"),
    });
    await client.set(
      this.uploadKey(jobId, upload.uploadSlotId),
      payload,
      "EX",
      UPLOAD_TTL_SECONDS,
    );
  }

  async loadUploadsByJobId(
    jobId: string,
    uploadSlotIds: readonly string[],
  ): Promise<Map<string, ImportUpload>> {
    const client = this.redisService.getClient();
    const uploads = new Map<string, ImportUpload>();

    for (const uploadSlotId of uploadSlotIds) {
      const raw = await client.get(this.uploadKey(jobId, uploadSlotId));
      if (!raw) {
        continue;
      }
      const parsed = JSON.parse(raw) as {
        uploadSlotId: string;
        originalName: string;
        mimeType?: string;
        buffer: string;
      };
      uploads.set(uploadSlotId, {
        uploadSlotId: parsed.uploadSlotId,
        originalName: parsed.originalName,
        mimeType: parsed.mimeType,
        buffer: Buffer.from(parsed.buffer, "base64"),
      });
    }

    return uploads;
  }

  async clearUploadsByJobId(
    jobId: string,
    uploadSlotIds: readonly string[],
  ): Promise<void> {
    const client = this.redisService.getClient();
    if (uploadSlotIds.length === 0) {
      return;
    }
    const keys = uploadSlotIds.map((uploadSlotId) =>
      this.uploadKey(jobId, uploadSlotId),
    );
    await client.del(...keys);
  }

  async saveErrorBlobByJobId(jobId: string, buffer: Buffer): Promise<void> {
    const client = this.redisService.getClient();
    await client.set(
      this.errorBlobKey(jobId),
      buffer,
      "EX",
      ERROR_BLOB_TTL_SECONDS,
    );
  }

  async getErrorBlobByJobId(jobId: string): Promise<Buffer | null> {
    const client = this.redisService.getClient();
    const data = await client.getBuffer(this.errorBlobKey(jobId));
    return data ?? null;
  }

  async getActiveJobIdByImportKind(importKind: string): Promise<string | null> {
    const client = this.redisService.getClient();
    return client.get(this.activeJobKey(importKind));
  }

  async setActiveJobIdByImportKind(
    importKind: string,
    jobId: string,
  ): Promise<void> {
    const client = this.redisService.getClient();
    await client.set(
      this.activeJobKey(importKind),
      jobId,
      "EX",
      ACTIVE_JOB_TTL_SECONDS,
    );
  }

  async clearActiveJobIdByImportKind(
    importKind: string,
    jobId: string,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const activeJobId = await this.getActiveJobIdByImportKind(importKind);
    if (activeJobId === jobId) {
      await client.del(this.activeJobKey(importKind));
    }
  }
}
