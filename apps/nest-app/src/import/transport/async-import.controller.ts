import type { MessageEvent } from "@nestjs/common";
import { Controller, Get, Param, Res, Sse } from "@nestjs/common";
import { ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type { Observable } from "rxjs";
import { ImportJobProgressSseService } from "./import-job-progress-sse.service";
import { ImportTransportService } from "./import-transport.service";

@ApiTags("Async Import")
@Controller("applications/async-import")
export class AsyncImportController {
  constructor(
    private readonly importTransportService: ImportTransportService,
    private readonly importJobProgressSseService: ImportJobProgressSseService,
  ) {}

  @ApiOperation({
    summary: "Stream async import job progress (SSE)",
    description:
      "Subscribe after POST returns jobId. Each event data payload is JobMeta. Stream ends when phase is complete or failed.",
  })
  @ApiProduces("text/event-stream")
  @Sse("jobs/:jobId/events")
  streamJobEvents(@Param("jobId") jobId: string): Observable<MessageEvent> {
    return this.importJobProgressSseService.streamByJobId(jobId);
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
