import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { DomainRegistry } from "@/async-processing/async-processing-core/domain-registry.service";
import { buildUploadSessionContextFromMultipartBody } from "./build-upload-session-context";
import { LocalMultipartUploadService } from "./local-multipart-upload.service";
import type { LocalUploadSession } from "./local-upload-session.types";
import {
  createLocalMultipartMulterOptions,
  RESOLVED_UPLOAD_SESSION_ID,
} from "./multer-disk-storage.factory";

type RequestWithSessionId = Request & {
  [RESOLVED_UPLOAD_SESSION_ID]?: string;
};

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

@Controller("applications/async-processing")
export class LocalMultipartUploadController {
  constructor(
    private readonly domainRegistry: DomainRegistry,
    private readonly localMultipartUploadService: LocalMultipartUploadService,
  ) {}

  @Post(":domainKind/upload")
  @UseInterceptors(AnyFilesInterceptor(createLocalMultipartMulterOptions()))
  async upload(
    @Param("domainKind") domainKindFromRoute: string,
    @UploadedFiles() uploadedFiles: Express.Multer.File[] | undefined,
    @Body() body: Record<string, string | undefined>,
    @Req() req: RequestWithSessionId,
  ) {
    const registration =
      this.domainRegistry.getByDomainKind(domainKindFromRoute);
    const session: LocalUploadSession = {
      domainKind: domainKindFromRoute,
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
}
