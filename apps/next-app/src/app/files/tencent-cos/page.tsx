"use client";

import axios from "axios";
import COS from "cos-js-sdk-v5";
import { nanoid } from "nanoid";
import { useState } from "react";
import { elysiaBaseUrl } from "@/lib/api-base-url";

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
          const res = await axios.get(
            `${apiBaseUrl}/tencent-cos-objects/temporary-credential`,
          );
          console.log(res.data);
          const { tmpSecretId, tmpSecretKey, sessionToken } =
            res.data.credentials;
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
            const res = await axios.put(
              `${apiBaseUrl}/tencent-cos-objects/uploadFileToCos`,
              { file: file },
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
                /**
                 * Note that the progress only shows the progress of the client uploading to the server,
                 * not the server uploading to Tencent COS
                 */
                onUploadProgress(progressEvent) {
                  const percentCompleted = progressEvent.progress
                    ? (progressEvent.progress * 100).toFixed(2) + "%"
                    : "0%";
                  setProgress(percentCompleted);
                },
              },
            );
            console.log(res);
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
          const res = await axios.get(
            `${apiBaseUrl}/tencent-cos-objects/temporary-credential`,
          );
          console.log(res.data);
          const { tmpSecretId, tmpSecretKey, sessionToken } =
            res.data.credentials;
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
    <div className="flex flex-col items-start gap-1">
      <h1 className="text-lg">Tencent COS Download from COS directly</h1>
      <h3 className="text-sm">
        This method requests a temporary credential from our backend first, then
        download a file from Tencent COS directly.
      </h3>
      <div>{progress}</div>
      <button
        className="rounded bg-blue-500 p-2 text-gray-50"
        onClick={async () => {
          const res = await axios.get(
            `${apiBaseUrl}/tencent-cos-objects/temporary-credential`,
          );
          console.log(res.data);
          const { tmpSecretId, tmpSecretKey, sessionToken } =
            res.data.credentials;
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
          const res = await axios.get(
            `${apiBaseUrl}/tencent-cos-objects/temporary-credential`,
          );
          console.log(res.data);
          const { tmpSecretId, tmpSecretKey, sessionToken } =
            res.data.credentials;
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
                const res = await axios.get(
                  `${apiBaseUrl}/tencent-cos-objects/temporary-credential`,
                );
                console.log(res.data);
                const { tmpSecretId, tmpSecretKey, sessionToken } =
                  res.data.credentials;
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
