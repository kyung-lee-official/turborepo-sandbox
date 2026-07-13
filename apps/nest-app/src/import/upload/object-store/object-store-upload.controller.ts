import { Body, Controller, Param, Post } from "@nestjs/common";
import {
  objectStoreUploadCompleteBodySchema,
  objectStoreUploadInitiateBodySchema,
} from "./object-store-upload.schema";
import { ObjectStoreUploadService } from "./object-store-upload.service";

@Controller("applications/async-processing")
export class ObjectStoreUploadController {
  constructor(
    private readonly objectStoreUploadService: ObjectStoreUploadService,
  ) {}

  @Post(":domainKind/upload/s3/initiate")
  initiateS3(@Param("domainKind") domainKind: string, @Body() body: unknown) {
    const parsed = objectStoreUploadInitiateBodySchema.parse(body ?? {});
    return this.objectStoreUploadService.initiateS3(domainKind, parsed);
  }

  @Post(":domainKind/upload/s3/complete")
  completeS3(@Param("domainKind") domainKind: string, @Body() body: unknown) {
    const parsed = objectStoreUploadCompleteBodySchema.parse(body ?? {});
    return this.objectStoreUploadService.complete(domainKind, "s3", parsed);
  }

  @Post(":domainKind/upload/cos/initiate")
  initiateCos(@Param("domainKind") domainKind: string, @Body() body: unknown) {
    const parsed = objectStoreUploadInitiateBodySchema.parse(body ?? {});
    return this.objectStoreUploadService.initiateCos(domainKind, parsed);
  }

  @Post(":domainKind/upload/cos/complete")
  completeCos(@Param("domainKind") domainKind: string, @Body() body: unknown) {
    const parsed = objectStoreUploadCompleteBodySchema.parse(body ?? {});
    return this.objectStoreUploadService.complete(domainKind, "cos", parsed);
  }

  @Post(":domainKind/upload/aliyun-oss/initiate")
  initiateAliyunOss(
    @Param("domainKind") domainKind: string,
    @Body() body: unknown,
  ) {
    const parsed = objectStoreUploadInitiateBodySchema.parse(body ?? {});
    return this.objectStoreUploadService.initiateAliyunOss(domainKind, parsed);
  }

  @Post(":domainKind/upload/aliyun-oss/complete")
  completeAliyunOss(
    @Param("domainKind") domainKind: string,
    @Body() body: unknown,
  ) {
    const parsed = objectStoreUploadCompleteBodySchema.parse(body ?? {});
    return this.objectStoreUploadService.complete(domainKind, "aliyun", parsed);
  }
}
