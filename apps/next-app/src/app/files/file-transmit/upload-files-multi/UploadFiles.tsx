import { useQuery } from "@tanstack/react-query";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { getAttachmentListByEventId, UploadFilesQK } from "./api";
import { FileToUpload } from "./FileToUpload";
import { FileToPreview } from "./file-to-preview/FileToPreview";

export type Item = File | Preview;
export type Preview = {
  name: string;
};

export const UploadFiles = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  /* displayList = serverData + uploadList */
  const [serverData, setServerData] = useState<Preview[]>([]);
  const [uploadList, setUploadList] = useState<File[]>([]);
  const [displayList, setDisplayList] = useState<Item[]>([]);

  const previewQuery = useQuery<Preview[], Error>({
    queryKey: [UploadFilesQK.GET_PREVIEW_FILELIST],
    queryFn: async (): Promise<Preview[]> => {
      const data = await getAttachmentListByEventId();
      return data as Preview[];
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (previewQuery.data) {
      setServerData(previewQuery.data);
    }
  }, [previewQuery.data]);

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    const files = e.target.files;
    if (!files) return;
    // console.log(files);
    /* convert FileList to Array so it can be mapped */
    setUploadList(Array.from(files));
  }
  useEffect(() => {
    if (uploadList) {
      setDisplayList([...serverData, ...uploadList]);
    }
  }, [serverData, uploadList]);

  return (
    <div className="flex flex-col items-start justify-center gap-2">
      <button
        className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
        onClick={() => {
          /* clear the input field */
          inputRef.current!.value = "";
          setUploadList([]);
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
      <div className="grid min-h-32 w-134 grid-cols-4 justify-items-stretch gap-6 rounded-md bg-black p-2">
        {displayList.length > 0 &&
          displayList.map((file, i) => {
            if (file instanceof File) {
              return (
                <FileToUpload
                  key={file.name}
                  file={file}
                  setUploadList={setUploadList}
                />
              );
            } else {
              return <FileToPreview key={file.name} preview={file} />;
            }
          })}
      </div>
    </div>
  );
};
