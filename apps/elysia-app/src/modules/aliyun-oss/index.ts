import { mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import OSS from "ali-oss";
import { Elysia, status, t } from "elysia";

const NEST_TO_ALIYUN_OSS_PREFIX = "nest-to-aliyun-oss";
const SIGNED_DOWNLOAD_EXPIRES_SECONDS = 600;
const stagingDir = join(process.cwd(), "temp", "upload-to-aliyun-oss");

type StagingFile = { name: string; sizeBytes: number };
type UploadedStagingFile = {
  name: string;
  objectKey: string;
  signedDownloadUrl: string;
};
type OssBucketObject = {
  name: string;
  objectKey: string;
  sizeBytes: number;
  lastModified: string;
};

function requireOssEnv(): {
  accessKeyId: string;
  accessKeySecret: string;
  region: string;
  bucket: string;
} {
  const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID ?? "";
  const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_SECRET ?? "";
  const region = process.env.ALIYUN_OSS_REGION ?? "";
  const bucket = process.env.ALIYUN_OSS_BUCKET ?? "";
  if (!accessKeyId || !accessKeySecret || !region || !bucket) {
    throw status(500, {
      error:
        "ALIYUN_OSS_ACCESS_KEY_ID, ALIYUN_OSS_ACCESS_SECRET, ALIYUN_OSS_REGION, and ALIYUN_OSS_BUCKET are required",
    });
  }
  return { accessKeyId, accessKeySecret, region, bucket };
}

function createOssClient(options?: { authorizationV4?: boolean }): OSS {
  const env = requireOssEnv();
  return new OSS({
    accessKeyId: env.accessKeyId,
    accessKeySecret: env.accessKeySecret,
    region: env.region,
    bucket: env.bucket,
    ...(options?.authorizationV4 ? { authorizationV4: true } : {}),
    endpoint: `https://${env.region}.aliyuncs.com`,
  });
}

function nestToAliyunOssPrefix(): string {
  return `${NEST_TO_ALIYUN_OSS_PREFIX}/`;
}

function objectKeyForStagingFile(fileName: string): string {
  return `${NEST_TO_ALIYUN_OSS_PREFIX}/${fileName}`;
}

function assertSignableObjectKey(objectKey: string): void {
  const prefix = nestToAliyunOssPrefix();
  if (!objectKey.startsWith(prefix) || objectKey.length <= prefix.length) {
    throw status(400, {
      error: `objectKey must name an object under ${prefix}`,
    });
  }
}

async function getSignedDownloadUrl(
  objectKey: string,
  fileName?: string,
): Promise<string> {
  assertSignableObjectKey(objectKey);
  const client = createOssClient({ authorizationV4: true });
  const downloadFileName =
    fileName?.trim() ||
    objectKey.slice(objectKey.lastIndexOf("/") + 1) ||
    "download";
  const safeAsciiFileName = downloadFileName.replace(/["\\]/g, "_");
  const encodedFileName = encodeURIComponent(downloadFileName);

  return client.signatureUrlV4(
    "GET",
    SIGNED_DOWNLOAD_EXPIRES_SECONDS,
    {
      queries: {
        "response-content-disposition": `attachment; filename="${safeAsciiFileName}"; filename*=UTF-8''${encodedFileName}`,
      },
    },
    objectKey,
  );
}

async function ensureStagingDir(): Promise<void> {
  await mkdir(stagingDir, { recursive: true });
}

async function listStagingFiles(): Promise<StagingFile[]> {
  await ensureStagingDir();
  const entries = await readdir(stagingDir, { withFileTypes: true });
  const files: StagingFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filePath = join(stagingDir, entry.name);
    const fileStat = await stat(filePath);
    files.push({ name: entry.name, sizeBytes: fileStat.size });
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

async function ensureNestToAliyunOssPrefix(client: OSS): Promise<void> {
  const prefix = nestToAliyunOssPrefix();
  const listResult = (await client.list(
    { prefix, "max-keys": 1 },
    {},
  )) as OSS.ListObjectResult;
  const hasObjects =
    Array.isArray(listResult.objects) && listResult.objects.length > 0;
  const hasPrefixes =
    Array.isArray(listResult.prefixes) && listResult.prefixes.length > 0;
  if (hasObjects || hasPrefixes) return;
  await client.put(prefix, Buffer.alloc(0));
}

async function listNestToAliyunOssObjects(): Promise<OssBucketObject[]> {
  const client = createOssClient();
  const prefix = nestToAliyunOssPrefix();
  const objects: OssBucketObject[] = [];
  let marker: string | undefined;

  do {
    const listResult = (await client.list(
      { prefix, "max-keys": 1000, ...(marker ? { marker } : {}) },
      {},
    )) as OSS.ListObjectResult;

    for (const object of listResult.objects ?? []) {
      const objectKey = object.name;
      if (!objectKey || objectKey === prefix) continue;
      const nameFromPrefix = objectKey.slice(prefix.length);
      if (!nameFromPrefix || nameFromPrefix.includes("/")) continue;
      objects.push({
        name: nameFromPrefix,
        objectKey,
        sizeBytes: object.size,
        lastModified: object.lastModified,
      });
    }

    marker = listResult.isTruncated ? listResult.nextMarker : undefined;
  } while (marker);

  return objects.sort((a, b) => a.name.localeCompare(b.name));
}

async function deleteNestToAliyunOssObject(objectKey: string): Promise<void> {
  assertSignableObjectKey(objectKey);
  const client = createOssClient();
  await client.delete(objectKey);
}

async function uploadStagingFiles(): Promise<UploadedStagingFile[]> {
  const pending = await listStagingFiles();
  if (pending.length === 0) {
    throw status(400, {
      error: `No files in ${stagingDir}. Add a file and try again.`,
    });
  }

  const client = createOssClient();
  await ensureNestToAliyunOssPrefix(client);
  const uploaded: UploadedStagingFile[] = [];

  for (const file of pending) {
    const localPath = join(stagingDir, file.name);
    const objectKey = objectKeyForStagingFile(file.name);
    await client.put(objectKey, localPath);
    const signedDownloadUrl = await getSignedDownloadUrl(objectKey, file.name);
    uploaded.push({ name: file.name, objectKey, signedDownloadUrl });
  }

  return uploaded;
}

const objectKeyBody = t.Object({ objectKey: t.Optional(t.String()) });
const downloadUrlBody = t.Object({
  objectKey: t.Optional(t.String()),
  fileName: t.Optional(t.String()),
});

export const aliyunOssRoutes = new Elysia({ prefix: "/aliyun-oss" })
  .get("/staging", async () => {
    const files = await listStagingFiles();
    return { stagingDir, files };
  })
  .get("/bucket", async () => {
    const objects = await listNestToAliyunOssObjects();
    return { prefix: "nest-to-aliyun-oss/", objects };
  })
  .delete(
    "/bucket/object",
    async ({ body }) => {
      const objectKey = body.objectKey?.trim();
      if (!objectKey) {
        throw status(400, { error: "objectKey is required" });
      }
      await deleteNestToAliyunOssObject(objectKey);
      return { deleted: objectKey };
    },
    { body: objectKeyBody },
  )
  .post("/staging/upload", async () => {
    const uploaded = await uploadStagingFiles();
    return { uploaded };
  })
  .post(
    "/download-signed-url",
    async ({ body }) => {
      const objectKey = body.objectKey?.trim();
      if (!objectKey) {
        throw status(400, { error: "objectKey is required" });
      }
      const url = await getSignedDownloadUrl(objectKey, body.fileName?.trim());
      return { url };
    },
    { body: downloadUrlBody },
  );
