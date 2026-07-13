import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { nanoid } from "nanoid";
import { DomainRegistry } from "@/async-processing/async-processing-core/domain-registry.service";
import { UploadSessionStore } from "@/async-processing/start-processing-adapters/upload-session.store";
import { DEFAULT_UPLOAD_SESSION_TTL_SECONDS } from "@/async-processing/start-processing-adapters/upload-session.types";
import { AliyunOssPresignedPutService } from "./aliyun-oss-presigned-put.service";
import { buildObjectSessionSources } from "./build-object-session-sources";
import { buildObjectUploadKey } from "./build-object-upload-key";
import { CosScopedStsService } from "./cos-scoped-sts.service";
import type {
  ObjectStoreUploadCompleteBody,
  ObjectStoreUploadInitiateBody,
} from "./object-store-upload.schema";
import { PendingObjectUploadStore } from "./pending-object-upload.store";
import type {
  ObjectStoreProvider,
  PendingObjectFile,
  PendingObjectUpload,
} from "./pending-object-upload.types";
import { S3PresignedPutService } from "./s3-presigned-put.service";
import {
  type InitiateFileInput,
  validateInitiateFiles,
} from "./validate-initiate-files";

@Injectable()
export class ObjectStoreUploadService {
  constructor(
    private readonly domainRegistry: DomainRegistry,
    private readonly pendingStore: PendingObjectUploadStore,
    private readonly uploadSessionStore: UploadSessionStore,
    private readonly s3PresignedPutService: S3PresignedPutService,
    private readonly cosScopedStsService: CosScopedStsService,
    private readonly aliyunOssPresignedPutService: AliyunOssPresignedPutService,
  ) {}

  async initiateS3(domainKind: string, body: ObjectStoreUploadInitiateBody) {
    return this.initiatePresignedPut(domainKind, "s3", body, (file, key) =>
      this.s3PresignedPutService.createPresignedPut({
        key,
        mimeType: file.mimeType,
      }),
    );
  }

  async initiateAliyunOss(
    domainKind: string,
    body: ObjectStoreUploadInitiateBody,
  ) {
    return this.initiatePresignedPut(domainKind, "aliyun", body, (file, key) =>
      this.aliyunOssPresignedPutService.createPresignedPut({
        key,
        mimeType: file.mimeType,
      }),
    );
  }

  async initiateCos(domainKind: string, body: ObjectStoreUploadInitiateBody) {
    const registration = this.domainRegistry.getByDomainKind(domainKind);
    validateInitiateFiles(body.files, registration);

    const uploadSessionId = body.uploadSessionId?.trim() || nanoid();
    const { credential, region, bucket } =
      await this.cosScopedStsService.issueScopedCredential(uploadSessionId);
    const prefix = this.cosScopedStsService.getUploadPrefix();

    const pending: Record<string, PendingObjectFile> = {};
    const uploads: Record<string, { sourceId: string; key: string }> = {};

    for (const file of body.files) {
      const key = buildObjectUploadKey({
        prefix,
        uploadSessionId,
        sourceId: file.sourceId,
        originalName: file.originalName,
        mimeType: file.mimeType,
      });
      pending[file.sourceId] = {
        sourceId: file.sourceId,
        bucket,
        key,
        originalName: file.originalName,
        mimeType: file.mimeType,
      };
      uploads[file.sourceId] = { sourceId: file.sourceId, key };
    }

    await this.pendingStore.save("cos", {
      uploadSessionId,
      domainKind,
      provider: "cos",
      region,
      pending,
    });

    return {
      uploadSessionId,
      credential,
      region,
      bucket,
      uploads,
    };
  }

  async complete(
    domainKind: string,
    provider: ObjectStoreProvider,
    body: ObjectStoreUploadCompleteBody,
  ): Promise<{ uploadSessionId: string }> {
    const pending = await this.pendingStore.require(
      provider,
      body.uploadSessionId,
    );
    if (pending.domainKind !== domainKind) {
      throw new BadRequestException(
        `Pending upload domainKind mismatch for session ${body.uploadSessionId}`,
      );
    }

    const sources = buildObjectSessionSources(pending, body.files, provider);
    const expiresAt = new Date(
      Date.now() + DEFAULT_UPLOAD_SESSION_TTL_SECONDS * 1000,
    );

    await this.uploadSessionStore.save({
      uploadSessionId: body.uploadSessionId,
      domainKind,
      sources,
      expiresAt,
    });
    await this.pendingStore.delete(provider, body.uploadSessionId);

    return { uploadSessionId: body.uploadSessionId };
  }

  private async initiatePresignedPut(
    domainKind: string,
    provider: Extract<ObjectStoreProvider, "s3" | "aliyun">,
    body: ObjectStoreUploadInitiateBody,
    presign: (
      file: InitiateFileInput,
      key: string,
    ) => Promise<{
      bucket: string;
      presignedPutUrl: string;
      requiredHeaders?: { "Content-Type"?: string };
    }>,
  ) {
    const registration = this.domainRegistry.getByDomainKind(domainKind);
    validateInitiateFiles(body.files, registration);

    const uploadSessionId = body.uploadSessionId?.trim() || nanoid();
    const prefix =
      provider === "s3"
        ? this.s3PresignedPutService.getUploadPrefix()
        : this.aliyunOssPresignedPutService.getUploadPrefix();

    const pending: Record<string, PendingObjectFile> = {};
    const uploads: Record<
      string,
      {
        sourceId: string;
        bucket: string;
        key: string;
        presignedPutUrl: string;
        requiredHeaders?: { "Content-Type"?: string };
      }
    > = {};

    for (const file of body.files) {
      const key = buildObjectUploadKey({
        prefix,
        uploadSessionId,
        sourceId: file.sourceId,
        originalName: file.originalName,
        mimeType: file.mimeType,
      });
      const signed = await presign(file, key);
      pending[file.sourceId] = {
        sourceId: file.sourceId,
        bucket: signed.bucket,
        key,
        originalName: file.originalName,
        mimeType: file.mimeType,
      };
      uploads[file.sourceId] = {
        sourceId: file.sourceId,
        bucket: signed.bucket,
        key,
        presignedPutUrl: signed.presignedPutUrl,
        ...(signed.requiredHeaders
          ? { requiredHeaders: signed.requiredHeaders }
          : {}),
      };
    }

    const record: PendingObjectUpload = {
      uploadSessionId,
      domainKind,
      provider,
      pending,
    };
    await this.pendingStore.save(provider, record);

    return { uploadSessionId, uploads };
  }
}
