import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { diskStorage } from "multer";
import { nanoid } from "nanoid";
import { resolveVfrToCfrMaxUploadBytes } from "../vfr-to-cfr.constants";
import { getUploadedDir } from "./storage-paths";

export const VFR_TO_CFR_UPLOAD_ID = "vfrToCfrUploadId" as const;

type RequestWithUploadId = Express.Request & {
  [VFR_TO_CFR_UPLOAD_ID]?: string;
};

export function createVfrToCfrUploadMulterOptions(): {
  storage: ReturnType<typeof diskStorage>;
  limits: { fileSize: number };
} {
  return {
    limits: { fileSize: resolveVfrToCfrMaxUploadBytes() },
    storage: diskStorage({
      destination: async (_req, _file, cb) => {
        try {
          const dir = getUploadedDir();
          await mkdir(dir, { recursive: true });
          cb(null, dir);
        } catch (error) {
          cb(error as Error, "");
        }
      },
      filename: (req, _file, cb) => {
        const request = req as RequestWithUploadId;
        const id = request[VFR_TO_CFR_UPLOAD_ID] ?? nanoid();
        request[VFR_TO_CFR_UPLOAD_ID] = id;
        cb(null, `${id}.mp4`);
      },
    }),
  };
}

export function readUploadIdFromRequest(
  req: Express.Request,
): string | undefined {
  return (req as RequestWithUploadId)[VFR_TO_CFR_UPLOAD_ID];
}

export function assignUploadIdToRequest(
  req: Express.Request,
  id: string,
): void {
  (req as RequestWithUploadId)[VFR_TO_CFR_UPLOAD_ID] = id;
}

export function uploadedVideoFileName(id: string): string {
  return `${id}.mp4`;
}

export function joinUploadedPath(id: string): string {
  return join(getUploadedDir(), uploadedVideoFileName(id));
}
