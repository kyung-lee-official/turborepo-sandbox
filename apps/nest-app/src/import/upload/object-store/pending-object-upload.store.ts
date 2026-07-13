import { Injectable, NotFoundException } from "@nestjs/common";
import { RedisService } from "@/redis/redis.service";
import {
  DEFAULT_PENDING_UPLOAD_TTL_SECONDS,
  PENDING_OBJECT_UPLOAD_REDIS_PREFIX,
} from "./object-store-upload.constants";
import type {
  ObjectStoreProvider,
  PendingObjectUpload,
} from "./pending-object-upload.types";

@Injectable()
export class PendingObjectUploadStore {
  constructor(private readonly redisService: RedisService) {}

  private keyFor(
    provider: ObjectStoreProvider,
    uploadSessionId: string,
  ): string {
    return `${PENDING_OBJECT_UPLOAD_REDIS_PREFIX}${provider}:${uploadSessionId}`;
  }

  async save(
    provider: ObjectStoreProvider,
    record: PendingObjectUpload,
    ttlSeconds = DEFAULT_PENDING_UPLOAD_TTL_SECONDS,
  ): Promise<void> {
    await this.redisService
      .getClient()
      .set(
        this.keyFor(provider, record.uploadSessionId),
        JSON.stringify(record),
        "EX",
        ttlSeconds,
      );
  }

  async get(
    provider: ObjectStoreProvider,
    uploadSessionId: string,
  ): Promise<PendingObjectUpload | null> {
    const raw = await this.redisService
      .getClient()
      .get(this.keyFor(provider, uploadSessionId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PendingObjectUpload;
  }

  async require(
    provider: ObjectStoreProvider,
    uploadSessionId: string,
  ): Promise<PendingObjectUpload> {
    const record = await this.get(provider, uploadSessionId);
    if (!record) {
      throw new NotFoundException(
        `Pending ${provider} upload not found or expired: ${uploadSessionId}`,
      );
    }
    return record;
  }

  async delete(
    provider: ObjectStoreProvider,
    uploadSessionId: string,
  ): Promise<void> {
    await this.redisService
      .getClient()
      .del(this.keyFor(provider, uploadSessionId));
  }
}
