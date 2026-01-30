import { Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ProgramLifecycleService } from "./program-lifecycle.service";

@ApiTags("Program Lifecycle")
@Controller("program-lifecycle")
export class ProgramLifecycleController {
  constructor(
    private readonly programLifecycleService: ProgramLifecycleService,
  ) {}

  @ApiOperation({ summary: "Start the program" })
  @Post("start")
  async start() {
    return await this.programLifecycleService.start();
  }

  @ApiOperation({ summary: "Pause the program" })
  @Post("pause")
  async pause() {
    return await this.programLifecycleService.pause();
  }

  @ApiOperation({ summary: "Resume the program" })
  @Post("resume")
  async resume() {
    return await this.programLifecycleService.resume();
  }

  @ApiOperation({ summary: "Abort the program" })
  @Post("abort")
  async abort() {
    return await this.programLifecycleService.abort();
  }

  @ApiOperation({ summary: "Get the program status" })
  @Get("status")
  async getStatus() {
    const status = await this.programLifecycleService.getStatus();
    return { status };
  }

  @ApiOperation({ summary: "Get the db status" })
  @Get("db-status")
  async getDbStatus() {
    const status = await this.programLifecycleService.getDbStatus();
    return { status };
  }
}
