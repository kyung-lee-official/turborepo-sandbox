import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { DomainRegistry } from "@/async-processing/async-processing-core/domain-registry.service";
import { LocalMultipartUploadService } from "./local-multipart-upload.service";
import type { LocalUploadSession } from "./local-upload-session.types";
import {
  createLocalMultipartMulterOptions,
  RESOLVED_UPLOAD_SESSION_ID,
} from "./multer-disk-storage.factory";

type RequestWithSessionId = Request & {
  [RESOLVED_UPLOAD_SESSION_ID]?: string;
};

@Controller("applications/async-processing")
export class LocalMultipartUploadController {
  constructor(
    private readonly domainRegistry: DomainRegistry,
    private readonly localMultipartUploadService: LocalMultipartUploadService,
  ) {}

  @Post(":domainKind/upload")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "salesData", maxCount: 1 },
        { name: "inventory", maxCount: 1 },
        { name: "productDescriptions", maxCount: 1 },
      ],
      createLocalMultipartMulterOptions(),
    ),
  )
  async upload(
    @Param("domainKind") domainKindFromRoute: string,
    @UploadedFiles()
    files: Record<string, Express.Multer.File[] | undefined>,
    @Body("autoStart") autoStartRaw: string | undefined,
    @Body("uploadSessionId") uploadSessionId: string | undefined,
    @Req() req: RequestWithSessionId,
  ) {
    const registration =
      this.domainRegistry.getByDomainKind(domainKindFromRoute);
    const session: LocalUploadSession = {
      domainKind: domainKindFromRoute,
      autoStart: autoStartRaw === "true",
      uploadSessionId,
    };

    return this.localMultipartUploadService.handleUpload(
      files,
      session,
      registration.sourceSpecs,
      req,
    );
  }
}
