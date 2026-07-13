/**
 * Appendix D — Layer 1: object-store direct upload request bodies (S3, COS, Aliyun OSS initiate and complete).
 */

import { z } from "zod";

const initiateFileSchema = z.object({
  sourceId: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1).optional(),
});

export const objectStoreUploadInitiateBodySchema = z.object({
  uploadSessionId: z.string().min(1).optional(),
  files: z.array(initiateFileSchema).min(1),
});

const completeFileSchema = z.object({
  sourceId: z.string().min(1),
  declaredSizeBytes: z.number().int().nonnegative().optional(),
});

export const objectStoreUploadCompleteBodySchema = z.object({
  uploadSessionId: z.string().min(1),
  files: z.array(completeFileSchema).min(1),
});

export type ObjectStoreUploadInitiateBody = z.infer<
  typeof objectStoreUploadInitiateBodySchema
>;

export type ObjectStoreUploadCompleteBody = z.infer<
  typeof objectStoreUploadCompleteBodySchema
>;
