export const VFR_TO_CFR_DOMAIN_KIND = "vfr-to-cfr" as const;

export const VFR_TO_CFR_SOURCE_IDS = {
  video: "video",
} as const;

export const VFR_TO_CFR_DEFAULT_FPS = 30;

export const VFR_TO_CFR_TARGET_FPS_PRESETS = [
  23.976, 24, 25, 29.97, 30, 59.94, 60,
] as const;

export const VFR_TO_CFR_UPLOAD_MAX_BYTES_ENV = "VFR_TO_CFR_UPLOAD_MAX_BYTES";

export const DEFAULT_VFR_TO_CFR_UPLOAD_MAX_BYTES = 22 * 1024 * 1024 * 1024;

export function resolveVfrToCfrMaxUploadBytes(): number {
  const fromEnv = Number(process.env[VFR_TO_CFR_UPLOAD_MAX_BYTES_ENV]);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  return DEFAULT_VFR_TO_CFR_UPLOAD_MAX_BYTES;
}
