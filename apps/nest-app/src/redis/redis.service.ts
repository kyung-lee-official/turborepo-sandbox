import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      // password: process.env.REDIS_PASSWORD,
      // db: parseInt(process.env.REDIS_DB || "0"),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    /* Connection event handlers */
    this.redis.on("connect", () => {
      this.logger.log("Connected to Redis server");
    });

    this.redis.on("error", (error) => {
      this.logger.error("Redis connection error:", error);
    });

    this.redis.on("ready", () => {
      this.logger.log("Redis client ready");
    });
  }

  /**
   * Get the Redis client instance for direct operations
   */
  getClient(): Redis {
    return this.redis;
  }

  /* Cleanup on module destroy */
  onModuleDestroy() {
    this.logger.log("Disconnecting from Redis...");
    this.redis.disconnect();
  }
}
