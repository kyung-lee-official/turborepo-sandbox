import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redis: Redis;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>("REDIS_HOST") || "localhost";
    const port = parseInt(
      this.configService.get<string>("REDIS_PORT") || "6379",
      10,
    );

    this.redis = new Redis({
      host,
      port,
      // password: this.configService.get<string>('REDIS_PASSWORD'),
      // db: parseInt(this.configService.get<string>('REDIS_DB') || '0'),
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
