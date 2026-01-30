import { Injectable, Logger } from "@nestjs/common";
import type Redis from "ioredis";
import type { RedisService } from "../../../redis/redis.service";
import { REDIS_KEYS } from "../types";

@Injectable()
export class RedisStorageService {
  private readonly logger = new Logger(RedisStorageService.name);
  private readonly redis: Redis;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getClient();
  }

  /* Store file buffer temporarily in Redis with TTL */
  async storeFile(taskId: number, fileBuffer: Buffer): Promise<string> {
    const fileKey = REDIS_KEYS.fileStorage(taskId);
    const base64Data = fileBuffer.toString("base64");

    /* Store with 1 hour TTL (3600 seconds) */
    await this.redis.setex(fileKey, 3600, base64Data);

    // this.logger.debug(
    // 	`Stored file for task ${taskId} with key ${fileKey} (${Math.round(base64Data.length / 1024)}KB)`
    // );

    return fileKey;
  }

  /* Retrieve file buffer from Redis */
  async getFile(fileKey: string): Promise<Buffer | null> {
    const base64Data = await this.redis.get(fileKey);
    if (!base64Data) {
      this.logger.warn(`File not found for key ${fileKey}`);
      return null;
    }
    const fileBuffer = Buffer.from(base64Data, "base64");

    // this.logger.debug(
    // 	`Retrieved file for key ${fileKey} (${Math.round(fileBuffer.length / 1024)}KB)`
    // );

    return fileBuffer;
  }

  /* Delete file from Redis */
  async deleteFile(fileKey: string): Promise<void> {
    const deleted = await this.redis.del(fileKey);

    if (deleted > 0) {
      this.logger.debug(`Deleted file for key ${fileKey}`);
    } else {
      this.logger.warn(`File not found for deletion: ${fileKey}`);
    }
  }

  /* Check if file exists in Redis */
  async fileExists(fileKey: string): Promise<boolean> {
    const exists = await this.redis.exists(fileKey);
    return exists === 1;
  }

  /* Get file size in bytes */
  async getFileSize(fileKey: string): Promise<number> {
    const base64Data = await this.redis.get(fileKey);

    if (!base64Data) {
      return 0;
    }

    /* Calculate original buffer size from base64 */
    return Math.floor((base64Data.length * 3) / 4);
  }

  /* Store progress information in Redis */
  async storeProgress(taskId: number, progress: any): Promise<void> {
    const progressKey = REDIS_KEYS.taskProgress(taskId);
    await this.redis.setex(progressKey, 3600, JSON.stringify(progress));
  }

  /* Get progress information from Redis */
  async getProgress(taskId: number): Promise<any | null> {
    const progressKey = REDIS_KEYS.taskProgress(taskId);
    const progressData = await this.redis.get(progressKey);

    return progressData ? JSON.parse(progressData) : null;
  }

  /* Delete progress information from Redis */
  async deleteProgress(taskId: number): Promise<void> {
    const progressKey = REDIS_KEYS.taskProgress(taskId);
    await this.redis.del(progressKey);
  }
}
