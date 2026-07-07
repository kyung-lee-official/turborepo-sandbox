import { Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import {
  AsyncGeneratePdfService,
  type JobOutputFile,
  type MockInfoResponse,
  type StartAsyncGeneratePdfJobResult,
} from "./async-generate-pdf.service";

@Controller("async-generate-pdf")
export class AsyncGeneratePdfController {
  constructor(
    private readonly asyncGeneratePdfService: AsyncGeneratePdfService,
  ) {}

  @Get()
  getTemplateInfo() {
    return this.asyncGeneratePdfService.getTemplateInfo();
  }

  @Get("info")
  listMockInfo(): MockInfoResponse {
    return this.asyncGeneratePdfService.listMockInfo();
  }

  @Post("jobs")
  @HttpCode(202)
  startJob(): Promise<StartAsyncGeneratePdfJobResult> {
    return this.asyncGeneratePdfService.startJob();
  }

  @Get("jobs/:jobId/files")
  listJobOutputFiles(@Param("jobId") jobId: string): Promise<{
    outputBaseDir: string;
    zipFile: JobOutputFile | null;
  }> {
    return this.asyncGeneratePdfService.listJobOutputFiles(jobId);
  }
}
