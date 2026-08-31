"use client";

import ky from "ky";
import { useState } from "react";
import { elysiaBaseUrl } from "@/lib/api-base-url";
import { UploadFilesAny } from "./UploadFilesAny";
import { UploadFilesArray } from "./UploadFilesArray";

const apiBaseUrl = elysiaBaseUrl();

const DownloadBlob = () => {
  const [progress, setProgress] = useState<string>("0%");
  const [image, setImage] = useState<string>();
  return (
    <div className="flex flex-col items-start justify-center gap-2">
      <h1 className="text-lg">Download Blob</h1>
      <p>Throttle down your network in the dev tools to test this feature.</p>
      <button
        className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
        onClick={async () => {
          // ky is used here because the demo needs `onDownloadProgress`;
          // native fetch does not expose download progress events.
          const blob = await ky
            .get(`${apiBaseUrl}/techniques/file-download`, {
              onDownloadProgress: (progressEvent) => {
                const percentCompleted = progressEvent.percent
                  ? (progressEvent.percent * 100).toFixed(2) + "%"
                  : "0%";
                setProgress(percentCompleted);
              },
            })
            .blob();
          setImage(URL.createObjectURL(blob));
        }}
      >
        Download
      </button>
      <div>{progress}</div>
      {image && <img src={image} alt="downloaded" />}
    </div>
  );
};

const UploadFile = () => {
  const [progress, setProgress] = useState<string>("0%");
  return (
    <div className="flex flex-col items-start justify-center gap-2">
      <h1 className="text-lg">Upload File</h1>
      <p>The file is uploaded in multipart/form-data format.</p>
      <p>
        Throttle down your network in the dev tools to test this feature. The
        file will be uploaded to the server, check it out in the server&apos;s
        file system.
      </p>
      <form
        method="put"
        onSubmit={async (e: any) => {
          e.preventDefault();
          const file = e.target.file.files[0];
          console.log(file);
          // Note: the original axios call passed `{ file }` as a plain object
          // and explicitly set `Content-Type: multipart/form-data`, so axios
          // actually JSON-stringified the body. We preserve that exact
          // behaviour by using `ky` with a JSON body and the same header.
          await ky.put(`${apiBaseUrl}/techniques/file-upload`, {
            json: { file: file },
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = progressEvent.percent
                ? (progressEvent.percent * 100).toFixed(2) + "%"
                : "0%";
              setProgress(percentCompleted);
            },
          });
        }}
      >
        <input type="file" name="file" />
        <button
          className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
          type="submit"
        >
          Upload
        </button>
      </form>
      <div>{progress}</div>
    </div>
  );
};

const UploadBlob = () => {
  const [progress, setProgress] = useState<string>("0%");
  return (
    <div className="flex flex-col items-start justify-center gap-2">
      <h1 className="text-lg">Upload Blob</h1>
      <p>The blob is uploaded in multipart/form-data format.</p>
      <p>
        Throttle down your network in the dev tools to test this feature. The
        file will be uploaded to the server, check it out in the server&apos;s
        file system.
      </p>
      <p>
        This is useful if you need to convert a canvas to a blob for uploading.
        The key is to convert the blob to a file.
      </p>
      <p>
        For simplicity, we select a file and convert it to a blob instead of
        using a canvas here.
      </p>
      <form
        method="put"
        onSubmit={async (e: any) => {
          e.preventDefault();
          const file = e.target.file.files[0];
          const blob = new Blob([file]);
          const fileFromBlob = new File([blob], file.name);
          // See `UploadFile` for the explanation of the preserved header.
          await ky.put(`${apiBaseUrl}/techniques/file-upload`, {
            json: { file: fileFromBlob },
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = progressEvent.percent
                ? (progressEvent.percent * 100).toFixed(2) + "%"
                : "0%";
              setProgress(percentCompleted);
            },
          });
        }}
      >
        <input type="file" name="file" />
        <button
          className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
          type="submit"
        >
          Upload
        </button>
      </form>
      <div>{progress}</div>
    </div>
  );
};

const Content = () => {
  return (
    <div className="flex w-1/2 flex-col gap-10 p-10">
      <DownloadBlob />
      <hr />
      <UploadFile />
      <hr />
      <UploadBlob />
      <hr />
      <UploadFilesArray />
      <hr />
      <UploadFilesAny />
    </div>
  );
};

export default Content;
