import axios from "axios";
import Link from "next/link";
import { type ChangeEvent, useRef, useState } from "react";
import { elysiaBaseUrl } from "@/lib/api-base-url";

const apiBaseUrl = elysiaBaseUrl();

export const UploadFilesAny = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [progress, setProgress] = useState<string>("0%");

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    console.log(e.target.files);
    const files = e.target.files;
    if (!files) return;
    const data = new FormData();
    for (let i = 0; i < files.length; i++) {
      data.append("files", files[i]!);
    }
    const res = await axios.put(
      `${apiBaseUrl}/techniques/files-upload-any`,
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = progressEvent.progress
            ? (progressEvent.progress * 100).toFixed(2) + "%"
            : "0%";
          setProgress(percentCompleted);
        },
      },
    );
  }

  return (
    <div className="flex flex-col items-start justify-center gap-2">
      <h1 className="text-lg">
        <Link
          href={"https://docs.nestjs.com/techniques/file-upload#any-files"}
          className="underline"
        >
          Upload Files (with arbitrary field name keys)
        </Link>
      </h1>
      <p>The files are uploaded in multipart/form-data format.</p>
      <p>To upload an array of files (identified with a single field name)</p>
      <p>
        Throttle down (fast 4G) your network in the dev tools to test this
        feature. The file will be uploaded to the server, check it out in the
        server&apos;s file system.
      </p>
      <button
        type="button"
        className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
        onClick={() => {
          /* clear the input field */
          inputRef.current!.value = "";
          /* set progress to 0% */
          setProgress("0%");
          /* trigger the input field */
          inputRef.current?.click();
        }}
      >
        Upload
      </button>
      <form>
        <input
          type="file"
          multiple
          ref={inputRef}
          onChange={onFileChange}
          className="hidden"
        />
      </form>
      {progress}
    </div>
  );
};
