import type { PrismaService } from "@/recipes/prisma/prisma.service";

type TaskState = {
  shouldAbort: boolean;
  shouldPause: boolean;
};

/**
 * the time consuming program.
 *
 * since the task is long-running, there are two options:
 * - use async/await
 * - use worker threads
 *
 * if the task is a heavy task, it could block the event loop (main thread) and
 * cause the application unresponsive and cannot handle other events like pause or abort.
 * in this case, you can use worker threads to run the task in a separate thread, but still,
 * if the task is heavy enough, the separate thread will be blocked and cannot handle events from the main thread,
 * it only guarantee that the main thread will not be blocked.
 *
 * it's common to separate a heavy task into smaller blocks using setInterval(), this way you don't
 * necessarily to create a new thread for the task. setInterval() allows you to update the progress or status,
 * the processing time for each smaller block should be short enough to not block the event loop.
 */
export class YourTimeConsumingProgram {
  public shouldAbort: boolean = false;
  public shouldPause: boolean = false;

  public progress: { value: number } = { value: 0 };

  constructor(private readonly prisma: PrismaService) {
    /* ... any initialization ... */
  }

  async processChunk(chunkIndex: number) {
    /* update the progress */
    this.progress.value = chunkIndex;
    if (this.shouldAbort) return;
    if (this.shouldPause) {
      /* pause the task, save status to db */
      const status = await this.prisma.client.lifecycle.findFirst();
      if (status) {
        await this.prisma.client.lifecycle.update({
          where: { id: status.id },
          data: { value: chunkIndex },
        });
      } else {
        /* create a new lifecycle status */
        await this.prisma.client.lifecycle.create({
          data: { value: chunkIndex },
        });
      }
      return;
    }

    /**
     * process one chunk of work here (e.g., iterate over part of an array)
     * the chunk shouldn't be too CPU-intensive, because it will block the event loop during the execution.
     * the setTimeout() function produces a delay (time gap) between each chunk,
     * allowing the event loop to handle other tasks
     */
    for (let i = 0; i < 1000; i++) {
      /* CPU-intensive work here */
    }

    /* schedule the next chunk with a delay */
    setTimeout(() => this.processChunk(chunkIndex + 1), 200);
  }

  /* make run() for long-running programs */
  run() {
    /* start processing the task */
    this.processChunk(0);
  }

  async resume() {
    /* resume the task */
    const status = await this.prisma.client.lifecycle.findFirst();
    if (!status) {
      throw new Error("No lifecycle status found.");
    }
    this.processChunk(status.value);
  }

  async abort() {
    await this.prisma.client.lifecycle.deleteMany();
    this.shouldAbort = true;
  }
}
