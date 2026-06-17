import {
  Controller,
  Get,
  Param,
  Res,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { ImportTransportService } from "./import-transport.service";

@ApiTags("Async Import")
@Controller("applications/async-import")
export class AsyncImportController {
  constructor(private readonly importTransportService: ImportTransportService) {}

  @ApiOperation({ summary: "Get async import job meta" })
  @Get("jobs/:jobId")
  getJobMeta(@Param("jobId") jobId: string) {
    return this.importTransportService.getJobMetaByJobId(jobId);
  }

  @ApiOperation({ summary: "Download validation error blob" })
  @Get("jobs/:jobId/error-blob")
  async downloadErrorBlob(
    @Param("jobId") jobId: string,
    @Res() response: Response,
  ) {
    const blob = await this.importTransportService.getErrorBlobByJobId(jobId);
    response.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="validation-errors-${jobId}.xlsx"`,
    );
    response.send(blob);
  }
}
