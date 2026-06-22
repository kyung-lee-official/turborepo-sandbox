import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Request } from "express";
import { diskStorage } from "multer";
import { nanoid } from "nanoid";
import {
  extensionFromMime,
  extensionFromOriginalName,
} from "./extension-from-mime";

export const RESOLVED_UPLOAD_SESSION_ID = "resolvedUploadSessionId" as const;

type RequestWithSessionId = Request & {
  [RESOLVED_UPLOAD_SESSION_ID]?: string;
};

export function resolveUploadBaseDir(): string {
  return (
    process.env.PROCESSING_UPLOAD_BASE_DIR ??
    join(process.cwd(), "temp", "processing-uploads")
  );
}

export function createLocalMultipartMulterOptions(): {
  storage: ReturnType<typeof diskStorage>;
  limits: { fileSize: number };
} {
  const uploadBaseDir = resolveUploadBaseDir();
  const maxFileSizeBytes =
    Number(process.env.PROCESSING_UPLOAD_MAX_BYTES) || 200 * 1024 * 1024;

  return {
    limits: { fileSize: maxFileSizeBytes },
    storage: diskStorage({
      destination: async (req, _file, cb) => {
        try {
          const request = req as RequestWithSessionId;
          const sessionId =
            request.body?.uploadSessionId?.trim() ||
            request[RESOLVED_UPLOAD_SESSION_ID] ||
            nanoid();
          request[RESOLVED_UPLOAD_SESSION_ID] = sessionId;
          const dir = join(uploadBaseDir, sessionId);
          await mkdir(dir, { recursive: true });
          cb(null, dir);
        } catch (error) {
          cb(error as Error, "");
        }
      },
      filename: (_req, file, cb) => {
        const ext =
          extensionFromOriginalName(file.originalname) ||
          extensionFromMime(file.mimetype);
        cb(null, `${file.fieldname}-${nanoid()}${ext}`);
      },
    }),
  };
}
