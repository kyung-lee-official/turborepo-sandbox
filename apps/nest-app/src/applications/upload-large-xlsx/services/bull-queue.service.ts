import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";

import Bull = require("bull");

import type { RedisService } from "../../../redis/redis.service";
import type { FileProcessingProcessor } from "../processors/file-processing.processor";
import type { ProcessFileJobData } from "../types";

@Injectable()
export class BullQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BullQueueService.name);
  private fileProcessingQueue!: Bull.Queue<ProcessFileJobData>;

  constructor(
    private readonly redisService: RedisService,
    private readonly fileProcessingProcessor: FileProcessingProcessor,
  ) {}

  async onModuleInit() {
    /* Initialize Bull queue with Redis connection */
    const redisClient = this.redisService.getClient();

    this.fileProcessingQueue = new Bull<ProcessFileJobData>(
      "upload-xlsx-processing",
      {
        redis: {
          host: redisClient.options.host,
          port: redisClient.options.port,
          password: redisClient.options.password,
          db: redisClient.options.db || 0,
        },
        /**
         * Bull queue settings
         * if the job is CPU intensive or long-running,
         * consider adjusting stalledInterval accordingly,
         * or, better yet, implement heartbeat updates in the job processor.
         */
        settings: {
          stalledInterval: 30000 /* Check for stalled jobs every 30 seconds */,
          maxStalledCount: 1,
        },
        defaultJobOptions: {
          timeout: 300000 /* 5 minutes default */,
          removeOnComplete: 10 /* Keep 10 completed jobs for debugging */,
          removeOnFail: 50 /* Keep 50 failed jobs for analysis */,
          attempts: 3 /* Retry failed jobs up to 3 times */,
          backoff: {
            type: "exponential",
            delay: 2000 /* Start with 2 second delay */,
          },
        },
      },
    );

    /* Set up job processor */
    this.fileProcessingQueue.process(this.processJob.bind(this));

    /* Set up event listeners */
    this.setupEventListeners();

    // this.logger.log("Bull queue service initialized");
  }

  async onModuleDestroy() {
    if (this.fileProcessingQueue) {
      await this.fileProcessingQueue.close();
      this.logger.log("Bull queue service destroyed");
    }
  }

  /* Add a new file processing job to the queue */
  async addFileProcessingJob(
    jobData: ProcessFileJobData,
  ): Promise<Bull.Job<ProcessFileJobData>> {
    const job = await this.fileProcessingQueue.add(jobData, {
      jobId: `task-${jobData.taskId}` /* Unique job ID to prevent duplicates */,
    });

    // this.logger.debug(
    // 	`Added file processing job for task ${jobData.taskId}`
    // );

    return job;
  }

  /* Get job by ID */
  async getJob(jobId: string): Promise<Bull.Job<ProcessFileJobData> | null> {
    return this.fileProcessingQueue.getJob(jobId);
  }

  /* Get queue statistics */
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.fileProcessingQueue.getWaiting(),
      this.fileProcessingQueue.getActive(),
      this.fileProcessingQueue.getCompleted(),
      this.fileProcessingQueue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  /* Process job - delegates to FileProcessingProcessor */
  private async processJob(job: Bull.Job<ProcessFileJobData>) {
    // this.logger.debug(
    // 	`Processing job ${job.id} for task ${job.data.taskId}`
    // );

    try {
      const result = await this.fileProcessingProcessor.process(job);
      // this.logger.debug(`Job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  }

  /* Set up Bull event listeners for monitoring */
  private setupEventListeners() {
    this.fileProcessingQueue.on("completed", (job, result) => {
      // this.logger.log(
      // 	`Job ${job.id} completed for task ${job.data.taskId}`
      // );
    });

    this.fileProcessingQueue.on("failed", (job, err) => {
      this.logger.error(
        `Job ${job.id} failed for task ${job.data.taskId}:`,
        err,
      );
    });

    this.fileProcessingQueue.on("stalled", (job) => {
      this.logger.warn(`Job ${job.id} stalled for task ${job.data.taskId}`);
    });

    this.fileProcessingQueue.on("progress", (job, progress) => {
      // this.logger.debug(`Job ${job.id} progress: ${progress}%`);
    });

    this.fileProcessingQueue.on("waiting", (jobId) => {
      // this.logger.debug(`Job ${jobId} is waiting`);
    });

    this.fileProcessingQueue.on("active", (job, jobPromise) => {
      // this.logger.debug(
      // 	`Job ${job.id} started for task ${job.data.taskId}`
      // );
    });
  }
}
