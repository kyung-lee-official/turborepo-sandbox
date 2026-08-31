"use client";

import COS from "cos-js-sdk-v5";
import ky from "ky";
import { nanoid } from "nanoid";
import { useState } from "react";
import { elysiaBaseUrl } from "@/lib/api-base-url";
import { get } from "@/lib/fetcher";

const { VITE_BUCKET, VITE_REGION } = process.env;
const apiBaseUrl = elysiaBaseUrl();

const UploadToCos = () => {
  const [progress, setProgress] = useState<string>("0%");
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-lg">Tencent COS Put Upload to COS directly</h1>
      <h3 className="text-sm">
        This method requests a temporary credential from our backend first, then
        upload the file to Tencent COS directly.
      </h3>
      <form
        onSubmit={async (e: any) => {
          e.preventDefault();
          const res = await get<{
            credentials: {
              tmpSecretId: string;
              tmpSecretKey: string;
              sessionToken: string;
            };
          }>(`${apiBaseUrl}/tencent-cos-objects/temporary-credential`);
          console.log(res);
          const { tmpSecretId, tmpSecretKey, sessionToken } = res.credentials;
          const file = e.target.file.files[0];
          console.log(file);
          const cos = new COS({
            SecretId: tmpSecretId,
            SecretKey: tmpSecretKey,
            SecurityToken: sessionToken,
          });
          console.log(cos);
          const cosRes = await cos.putObject({
            Bucket: VITE_BUCKET as string,
            Region: VITE_REGION as string,
            Key: `app/${nanoid()}.mp4`,
            Body: file,
            onProgress: (progressData) => {
              const percentCompleted = progressData.percent
                ? (progressData.percent * 100).toFixed(2) + "%"
                : "0%";
              setProgress(percentCompleted);
            },
          });
        }}
        className="flex flex-col items-start gap-2"
      >
        <input type="file" name="file" />
        <div>{progress}</div>
        <button type="submit" className="rounded bg-blue-500 p-2 text-gray-50">
          Upload
        </button>
      </form>
    </div>
  );
};

/**
 * Not recommended, because the file is uploaded twice, and the client can't get the upload progress.
 */
const ServerForward = () => {
  const [progress, setProgress] = useState<string>("0%");
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-lg">
        <del>Tencent COS Put Upload to Server</del> (Not recommended)
      </h1>
      <h3 className="text-sm">
        This method upload the file to our backend server first, then the server
        upload the file to Tencent COS. The drawback is that the file is
        uploaded twice, and the client can&apos;t get the upload progress.
      </h3>
      <form
        method="put"
        onSubmit={async (e: any) => {
          e.preventDefault();
          const file = e.target.file.files[0];
          console.log(file);
          try {
            // ky is used here because the demo needs `onUploadProgress`; native
            // fetch does not expose upload progress events.
            // Note: the original axios call passed `{ file }` as a plain object
            // and explicitly set `Content-Type: multipart/form-data`, so axios
            // actually JSON-stringified the body. We preserve that exact
            // behaviour by using `ky` with a JSON body and the same header.
            await ky.put(`${apiBaseUrl}/tencent-cos-objects/uploadFileToCos`, {
              json: { file: file },
              headers: { "Content-Type": "multipart/form-data" },
              onUploadProgress(progressEvent) {
                const percentCompleted = progressEvent.percent
                  ? (progressEvent.percent * 100).toFixed(2) + "%"
                  : "0%";
                setProgress(percentCompleted);
              },
            });
          } catch (error) {
            console.error(error);
          }
        }}
        className="flex flex-col items-start gap-2"
      >
        <input type="file" name="file" />
        <div>{progress}</div>
        <button type="submit" className="rounded bg-blue-500 p-2 text-gray-50">
          Upload
        </button>
      </form>
    </div>
  );
};

const ListCosObjects = () => {
  const [objects, setObjects] = useState<any[]>([]);
  return (
    <div className="flex flex-col items-start gap-1">
      <h1 className="text-lg">Tencent COS List Objects</h1>
      <h3 className="text-sm">
        This method requests a temporary credential from our backend first, then
        list all objects in the bucket.
      </h3>
      <button
        className="rounded bg-blue-500 p-2 text-gray-50"
        onClick={async () => {
          const res = await get<{
            credentials: {
              tmpSecretId: string;
              tmpSecretKey: string;
              sessionToken: string;
            };
          }>(`${apiBaseUrl}/tencent-cos-objects/temporary-credential`);
          console.log(res);
          const { tmpSecretId, tmpSecretKey, sessionToken } = res.credentials;
          const cos = new COS({
            SecretId: tmpSecretId,
            SecretKey: tmpSecretKey,
            SecurityToken: sessionToken,
          });
          const cosRes = await cos.getBucket({
            Bucket: VITE_BUCKET as string,
            Region: VITE_REGION as string,
            Prefix: "app/avatar/",
            Delimiter: "/",
          });
          console.log(cosRes);
          setObjects(cosRes.Contents);
        }}
      >
        List Objects
      </button>
      <ul className="flex flex-col gap-1">
        {objects.map((object) => (
          <li key={object.Key}>{object.Key}</li>
        ))}
      </ul>
    </div>
  );
};

const DownloadFromCos = () => {
  const [progress, setProgress] = useState<string>("0%");
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-lg">Tencent COS Download from COS directly</h1>
      <h3 className="text-sm">
        This method requests a temporary credential from our backend first, then
        download a file from Tencent COS directly.
      </h3>
      <div>{progress}</div>
      <button
        className="rounded bg-blue-500 p-2 text-gray-50"
        onClick={async () => {
          const res = await get<{
            credentials: {
              tmpSecretId: string;
              tmpSecretKey: string;
              sessionToken: string;
            };
          }>(`${apiBaseUrl}/tencent-cos-objects/temporary-credential`);
          console.log(res);
          const { tmpSecretId, tmpSecretKey, sessionToken } = res.credentials;
          const cos = new COS({
            SecretId: tmpSecretId,
            SecretKey: tmpSecretKey,
            SecurityToken: sessionToken,
          });
          console.log(cos);
          const cosRes = await cos.getObject({
            Bucket: VITE_BUCKET as string,
            Region: VITE_REGION as string,
            Key: "app/53otzxy1n2-S3eid4hpQO.mp4",
            DataType: "blob",
            onProgress: (progressData) => {
              const percentCompleted = progressData.percent
                ? (progressData.percent * 100).toFixed(2) + "%"
                : "0%";
              setProgress(percentCompleted);
            },
          });
          /* Save to local */
          const blob = cosRes.Body as Blob;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "test.mp4";
          a.click();
        }}
      >
        Download
      </button>
    </div>
  );
};

const DeleteCosObject = () => {
  const [objects, setObjects] = useState<any[]>([]);
  return (
    <div className="flex flex-col items-start gap-1">
      <h1 className="text-lg">Tencent COS Delete Object</h1>
      <h3 className="text-sm">
        This method requests a temporary credential from our backend first, then
        delete an object in the bucket.
      </h3>
      <button
        className="rounded bg-blue-500 p-2 text-gray-50"
        onClick={async () => {
          const res = await get<{
            credentials: {
              tmpSecretId: string;
              tmpSecretKey: string;
              sessionToken: string;
            };
          }>(`${apiBaseUrl}/tencent-cos-objects/temporary-credential`);
          console.log(res);
          const { tmpSecretId, tmpSecretKey, sessionToken } = res.credentials;
          const cos = new COS({
            SecretId: tmpSecretId,
            SecretKey: tmpSecretKey,
            SecurityToken: sessionToken,
          });
          const cosRes = await cos.getBucket({
            Bucket: VITE_BUCKET as string,
            Region: VITE_REGION as string,
          });
          console.log(cosRes);
          setObjects(cosRes.Contents);
        }}
      >
        List Objects
      </button>
      <ul className="flex flex-col gap-1">
        {objects.map((object) => (
          <li key={object.Key}>
            <button
              className="rounded bg-red-500 p-2 text-gray-50"
              onClick={async () => {
                const res = await get<{
                  credentials: {
                    tmpSecretId: string;
                    tmpSecretKey: string;
                    sessionToken: string;
                  };
                }>(`${apiBaseUrl}/tencent-cos-objects/temporary-credential`);
                console.log(res);
                const { tmpSecretId, tmpSecretKey, sessionToken } =
                  res.credentials;
                const cos = new COS({
                  SecretId: tmpSecretId,
                  SecretKey: tmpSecretKey,
                  SecurityToken: sessionToken,
                });
                const cosRes = await cos.deleteObject({
                  Bucket: VITE_BUCKET as string,
                  Region: VITE_REGION as string,
                  Key: `app/${object.Key}`,
                });
                console.log(cosRes);
              }}
            >
              Delete
            </button>
            {object.Key}
          </li>
        ))}
      </ul>
    </div>
  );
};

const TencentCosPage = () => {
  return (
    <div className="flex flex-col gap-4 p-10">
      <UploadToCos />
      <hr />
      <ServerForward />
      <hr />
      <ListCosObjects />
      <hr />
      <DownloadFromCos />
      <hr />
      <DeleteCosObject />
    </div>
  );
};

export default TencentCosPage;
