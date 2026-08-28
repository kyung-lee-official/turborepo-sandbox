import COS from "cos-nodejs-sdk-v5";
import { Elysia, status, t } from "elysia";
import { nanoid } from "nanoid";
import { getCredential } from "qcloud-cos-sts";

function requireEnv(key: string): string {
  const value = process.env[key] ?? "";
  if (!value) {
    throw status(500, { error: `${key} is required` });
  }
  return value;
}

async function getTemporaryCredential() {
  const secretId = requireEnv("SECRET_ID");
  const secretKey = requireEnv("SECRET_KEY");
  const bucket = requireEnv("BUCKET");
  const region = requireEnv("REGION");

  const shortBucketName = bucket.split("-")[0];
  const appId = bucket.split("-")[1];
  const policy = {
    version: "2.0",
    statement: [
      {
        action: [
          "name/cos:GetBucket",
          "name/cos:PutObject",
          "name/cos:InitiateMultipartUpload",
          "name/cos:ListMultipartUploads",
          "name/cos:ListParts",
          "name/cos:UploadPart",
          "name/cos:CompleteMultipartUpload",
          "name/cos:GetObject",
          "name/cos:DeleteObject",
        ],
        effect: "allow",
        principal: { qcs: ["*"] },
        resource: [
          `qcs::cos:${region}:uid/${appId}:prefix//${appId}/${shortBucketName}/app/*`,
        ],
      },
    ],
  };

  return await getCredential({
    secretId,
    secretKey,
    proxy: "",
    durationSeconds: 300,
    policy,
  });
}

async function uploadFileToCos(file: File): Promise<COS.PutObjectResult> {
  const secretId = requireEnv("SECRET_ID");
  const secretKey = requireEnv("SECRET_KEY");
  const bucket = requireEnv("BUCKET");
  const region = requireEnv("REGION");

  const cos = new COS({ SecretId: secretId, SecretKey: secretKey });
  const buffer = Buffer.from(await file.arrayBuffer());

  return await cos.putObject({
    Bucket: bucket,
    Region: region,
    Key: `${nanoid()}.mp4`,
    Body: buffer as COS.UploadBody,
    onProgress: (progressData) => {
      console.log(JSON.stringify(progressData));
    },
  });
}

export const tencentCosRoutes = new Elysia({ prefix: "/tencent-cos-objects" })
  .get("/temporary-credential", async () => {
    return await getTemporaryCredential();
  })
  .put(
    "/uploadFileToCos",
    async ({ body }) => {
      return await uploadFileToCos(body.file);
    },
    { body: t.Object({ file: t.File() }) },
  );
