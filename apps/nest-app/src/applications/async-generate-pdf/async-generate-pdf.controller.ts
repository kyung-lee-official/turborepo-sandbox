import { Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import type { AsyncGeneratePdfInfoRow } from "./async-generate-pdf.mock-data";
import {
  AsyncGeneratePdfService,
  type GeneratedPdfFile,
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
  listMockInfo(): { rows: AsyncGeneratePdfInfoRow[] } {
    return { rows: this.asyncGeneratePdfService.listMockInfo() };
  }

  @Post("jobs")
  @HttpCode(202)
  startJob(): Promise<StartAsyncGeneratePdfJobResult> {
    return this.asyncGeneratePdfService.startJob();
  }

  @Get("jobs/:jobId/files")
  listJobOutputFiles(@Param("jobId") jobId: string): Promise<{
    outputDir: string;
    files: GeneratedPdfFile[];
  }> {
    return this.asyncGeneratePdfService.listJobOutputFiles(jobId);
  }
}
