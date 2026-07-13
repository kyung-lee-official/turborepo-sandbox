export const DEFAULT_PENDING_UPLOAD_TTL_SECONDS = 60 * 60 * 24;

export const PENDING_OBJECT_UPLOAD_REDIS_PREFIX =
  "async-processing:pending-object:" as const;

export const S3_UPLOAD_PREFIX_ENV = "S3_UPLOAD_PREFIX" as const;
export const S3_BUCKET_ENV = "S3_BUCKET" as const;

export const COS_UPLOAD_PREFIX_ENV = "COS_UPLOAD_PREFIX" as const;

export const ALIYUN_OSS_UPLOAD_PREFIX_ENV = "ALIYUN_OSS_UPLOAD_PREFIX" as const;

export const DEFAULT_OBJECT_UPLOAD_PREFIX = "async-processing/uploads";
