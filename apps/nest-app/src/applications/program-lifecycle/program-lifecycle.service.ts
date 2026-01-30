import {
  BadRequestException,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "@/recipes/prisma/prisma.service";
import { YourTimeConsumingProgram } from "./your-time-consuming-program";

@Injectable()
export class ProgramLifecycleService implements OnModuleInit, OnModuleDestroy {
  /* store your program instance */
  private programInstance: YourTimeConsumingProgram | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * called when the module is initialized
   * (e.g., app starts) you could potentially start the program if it was running previously.
   */
  async onModuleInit() {
    // this.start();
  }

  /**
   * called when the module is destroyed (e.g., app shuts down)
   * ensure clean shutdown
   */
  async onModuleDestroy() {
    this.abort();
  }

  async start() {
    /* only one instance allowed */
    if (this.programInstance) {
      throw new BadRequestException("Program already running.");
    }

    /* initialize your time-consuming program instance here */
    this.programInstance = new YourTimeConsumingProgram(this.prisma);
    this.programInstance.run();
    return "Program started.";
  }

  async pause() {
    /* ensure there is an instance */
    if (!this.programInstance) {
      throw new BadRequestException("Program not running.");
    }
    /* ensure it is not paused already */
    if (this.programInstance.shouldPause) {
      throw new BadRequestException("Program already paused.");
    }
    this.programInstance.shouldPause = true;
    return "Program paused.";
  }

  async resume() {
    /* ensure there is an instance */
    if (!this.programInstance) {
      throw new BadRequestException("Program instance not existing.");
    }
    /* and it is paused */
    if (this.programInstance) {
      this.programInstance.shouldPause = false;
    }
    await this.programInstance.resume();
    return "Program resumed.";
  }

  async abort() {
    /* ensure there is an instance */
    if (!this.programInstance) {
      throw new BadRequestException("Program instance not existing.");
    }

    /* stop your program instance */
    this.programInstance.abort();
    this.programInstance = null;
    return "Program aborted.";
  }

  async getStatus() {
    if (this.programInstance) {
      return this.programInstance.progress;
    } else {
      return { status: "not running" };
    }
  }

  async getDbStatus() {
    const status = await this.prisma.client.lifecycle.findFirst();
    if (!status) {
      return { status: "no status in db" };
    }
    return status;
  }
}
