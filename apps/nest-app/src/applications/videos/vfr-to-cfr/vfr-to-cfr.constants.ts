import type {
  DomainUploadPolicy,
  SourceSpec,
} from "@/async-processing/async-processing.types";

export const VFR_TO_CFR_DOMAIN_KIND = "vfr-to-cfr" as const;

export const VFR_TO_CFR_SOURCE_IDS = {
  video: "video",
} as const;

/** Demo default: force constant 30 fps. */
export const VFR_TO_CFR_DEFAULT_FPS = 30;

/** Env override for max multipart upload size (bytes). */
export const VFR_TO_CFR_UPLOAD_MAX_BYTES_ENV = "VFR_TO_CFR_UPLOAD_MAX_BYTES";

/** 22 GiB — headroom above ~20 GB source files. */
export const DEFAULT_VFR_TO_CFR_UPLOAD_MAX_BYTES = 22 * 1024 * 1024 * 1024;

export function resolveVfrToCfrMaxUploadBytes(): number {
  const fromEnv = Number(process.env[VFR_TO_CFR_UPLOAD_MAX_BYTES_ENV]);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  return DEFAULT_VFR_TO_CFR_UPLOAD_MAX_BYTES;
}

export const vfrToCfrSourceSpecs: SourceSpec[] = [
  { sourceId: VFR_TO_CFR_SOURCE_IDS.video, required: true },
];

export const vfrToCfrUploadPolicy: DomainUploadPolicy = {
  allowedMimeBySourceId: {
    [VFR_TO_CFR_SOURCE_IDS.video]: ["video/mp4", "application/octet-stream"],
  },
};
