import { Injectable } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";
import {
  ACTIVE_JOB_TTL_SECONDS,
  ActiveJobConflictError,
  STALE_PROCESSING_MS,
} from "../async-processing.types";
import { ProcessingJobRepository } from "./processing-job.repository";

const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

@Injectable()
export class ProcessingActiveJobLock {
  constructor(
    private readonly redisService: RedisService,
    private readonly jobRepository: ProcessingJobRepository,
  ) {}

  private keyForDomainKind(domainKind: string): string {
    return `async-processing:active:${domainKind}`;
  }

  async acquire(domainKind: string, jobId: string): Promise<void> {
    await this.tryAcquire(domainKind, jobId, true);
  }

  private async tryAcquire(
    domainKind: string,
    jobId: string,
    allowStaleRecovery: boolean,
  ): Promise<void> {
    const key = this.keyForDomainKind(domainKind);
    const result = await this.redisService
      .getClient()
      .set(key, jobId, "EX", ACTIVE_JOB_TTL_SECONDS, "NX");

    if (result === "OK") {
      return;
    }

    if (!allowStaleRecovery) {
      throw new ActiveJobConflictError(domainKind);
    }

    const activeJobId = await this.redisService.getClient().get(key);
    if (!activeJobId) {
      await this.tryAcquire(domainKind, jobId, false);
      return;
    }

    const activeJob = await this.jobRepository.findById(activeJobId);
    if (!activeJob) {
      await this.redisService.getClient().del(key);
      await this.tryAcquire(domainKind, jobId, false);
      return;
    }

    if (activeJob.phase === "complete" || activeJob.phase === "failed") {
      await this.redisService.getClient().del(key);
      await this.tryAcquire(domainKind, jobId, false);
      return;
    }

    if (activeJob.phase === "processing") {
      const staleMs = Date.now() - activeJob.updatedAt.getTime();
      if (staleMs > STALE_PROCESSING_MS) {
        await this.jobRepository.finalize(activeJobId, {
          phase: "failed",
          outcome: "failed",
          completedAt: new Date(),
        });
        await this.redisService.getClient().del(key);
        await this.tryAcquire(domainKind, jobId, false);
        return;
      }
    }

    throw new ActiveJobConflictError(domainKind);
  }

  async release(domainKind: string, jobId: string): Promise<void> {
    const key = this.keyForDomainKind(domainKind);
    await this.redisService
      .getClient()
      .eval(RELEASE_LOCK_SCRIPT, 1, key, jobId);
  }

  async isHeldBy(jobId: string, domainKind: string): Promise<boolean> {
    const key = this.keyForDomainKind(domainKind);
    const value = await this.redisService.getClient().get(key);
    return value === jobId;
  }

  async refreshLease(domainKind: string, jobId: string): Promise<void> {
    const key = this.keyForDomainKind(domainKind);
    const client = this.redisService.getClient();
    const value = await client.get(key);
    if (value === jobId) {
      await client.expire(key, ACTIVE_JOB_TTL_SECONDS);
    }
  }
}
