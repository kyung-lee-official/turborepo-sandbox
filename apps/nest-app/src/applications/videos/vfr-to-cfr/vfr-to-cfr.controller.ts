import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  StreamableFile,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { DomainRegistry } from "@/async-processing/async-processing-core/domain-registry.service";
import { ApiStartProcessingAdapter } from "@/async-processing/start-processing-adapters/api-start-processing.adapter";
import { buildUploadSessionContextFromMultipartBody } from "@/import/upload/local-multipart/build-upload-session-context";
import { LocalMultipartUploadService } from "@/import/upload/local-multipart/local-multipart-upload.service";
import type { LocalUploadSession } from "@/import/upload/local-multipart/local-upload-session.types";
import {
  createLocalMultipartMulterOptions,
  RESOLVED_UPLOAD_SESSION_ID,
} from "@/import/upload/local-multipart/multer-disk-storage.factory";
import {
  resolveVfrToCfrMaxUploadBytes,
  VFR_TO_CFR_DOMAIN_KIND,
} from "./vfr-to-cfr.constants";
import { VfrToCfrService } from "./vfr-to-cfr.service";
import { VfrToCfrMulterExceptionFilter } from "./vfr-to-cfr-multer.exception-filter";

type RequestWithSessionId = Request & {
  [RESOLVED_UPLOAD_SESSION_ID]?: string;
};

function vfrToCfrMulterOptions() {
  return createLocalMultipartMulterOptions({
    maxFileSizeBytes: resolveVfrToCfrMaxUploadBytes(),
  });
}

function groupUploadedFiles(
  files: Express.Multer.File[] | undefined,
): Record<string, Express.Multer.File[] | undefined> {
  const grouped: Record<string, Express.Multer.File[]> = {};
  for (const file of files ?? []) {
    const bucket = grouped[file.fieldname] ?? [];
    bucket.push(file);
    grouped[file.fieldname] = bucket;
  }
  return grouped;
}

@Controller("vfr-to-cfr")
export class VfrToCfrController {
  constructor(
    private readonly vfrToCfrService: VfrToCfrService,
    private readonly domainRegistry: DomainRegistry,
    private readonly localMultipartUploadService: LocalMultipartUploadService,
    private readonly apiStartProcessingAdapter: ApiStartProcessingAdapter,
  ) {}

  @Get()
  getTemplateInfo() {
    return this.vfrToCfrService.getTemplateInfo();
  }

  @Post("upload")
  @UseFilters(VfrToCfrMulterExceptionFilter)
  @UseInterceptors(AnyFilesInterceptor(vfrToCfrMulterOptions()))
  async upload(
    @UploadedFiles() uploadedFiles: Express.Multer.File[] | undefined,
    @Body() body: Record<string, string | undefined>,
    @Req() req: RequestWithSessionId,
  ) {
    const registration = this.domainRegistry.getByDomainKind(
      VFR_TO_CFR_DOMAIN_KIND,
    );
    const session: LocalUploadSession = {
      domainKind: VFR_TO_CFR_DOMAIN_KIND,
      autoStart: body.autoStart === "true",
      uploadSessionId: body.uploadSessionId,
      context: buildUploadSessionContextFromMultipartBody(
        body,
        registration.sourceSpecs.map((spec) => spec.sourceId),
      ),
    };

    return this.localMultipartUploadService.handleUpload(
      groupUploadedFiles(uploadedFiles),
      session,
      registration,
      req,
    );
  }

  @Post("start")
  @HttpCode(202)
  async start(@Body() body: { uploadSessionId?: string }) {
    return this.apiStartProcessingAdapter.handle({
      uploadSessionId: body.uploadSessionId,
      domainKind: VFR_TO_CFR_DOMAIN_KIND,
    });
  }

  @Get("jobs/:jobId/download")
  downloadResult(@Param("jobId") jobId: string): Promise<StreamableFile> {
    return this.vfrToCfrService.downloadResult(jobId);
  }
}
