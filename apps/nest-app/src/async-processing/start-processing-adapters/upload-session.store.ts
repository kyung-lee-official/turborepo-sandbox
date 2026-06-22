import { Injectable } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";
import {
  UPLOAD_SESSION_REDIS_KEY_PREFIX,
  type UploadSession,
} from "./upload-session.types";

type StoredUploadSession = Omit<UploadSession, "expiresAt"> & {
  expiresAt: string;
};

@Injectable()
export class UploadSessionStore {
  constructor(private readonly redisService: RedisService) {}

  private keyForSession(uploadSessionId: string): string {
    return `${UPLOAD_SESSION_REDIS_KEY_PREFIX}${uploadSessionId}`;
  }

  async save(session: UploadSession): Promise<void> {
    const ttlSeconds = Math.max(
      1,
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    );
    const stored: StoredUploadSession = {
      ...session,
      expiresAt: session.expiresAt.toISOString(),
    };
    await this.redisService
      .getClient()
      .set(
        this.keyForSession(session.uploadSessionId),
        JSON.stringify(stored),
        "EX",
        ttlSeconds,
      );
  }

  async get(uploadSessionId: string): Promise<UploadSession | null> {
    const raw = await this.redisService
      .getClient()
      .get(this.keyForSession(uploadSessionId));
    if (!raw) {
      return null;
    }

    const stored = JSON.parse(raw) as StoredUploadSession;
    const session: UploadSession = {
      ...stored,
      expiresAt: new Date(stored.expiresAt),
    };

    if (session.expiresAt < new Date()) {
      await this.consume(uploadSessionId);
      return null;
    }

    return session;
  }

  async consume(uploadSessionId: string): Promise<void> {
    await this.redisService
      .getClient()
      .del(this.keyForSession(uploadSessionId));
  }
}
