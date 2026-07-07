import { Controller, Get, Param, Post } from "@nestjs/common";
import {
  type AsyncGeneratePdfInfoRow,
  type AsyncGeneratePdfJob,
  AsyncGeneratePdfService,
  type GeneratedPdfFile,
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
  startJob(): Promise<AsyncGeneratePdfJob> {
    return this.asyncGeneratePdfService.startJob();
  }

  @Get("jobs/:jobId")
  getJob(@Param("jobId") jobId: string): AsyncGeneratePdfJob {
    return this.asyncGeneratePdfService.getJobById(jobId);
  }

  @Get("files")
  listOutputFiles(): Promise<{
    outputDir: string;
    files: GeneratedPdfFile[];
  }> {
    return this.asyncGeneratePdfService.listOutputFiles().then((files) => ({
      outputDir: this.asyncGeneratePdfService.getOutputDir(),
      files,
    }));
  }
}
