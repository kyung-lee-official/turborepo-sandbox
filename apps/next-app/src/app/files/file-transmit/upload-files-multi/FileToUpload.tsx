import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { queryClient } from "@/app/data-fetching/tanstack-query/queryClient";
import { UploadFilesQK } from "./api";
import { ItemLoading, UnknownFileTypeIcon } from "./file-to-preview/Icons";
import { Square } from "./Square";
import { isImageType, isVideoType } from "./types";

export const FileToUpload = (props: {
  file: File;
  setUploadList: Dispatch<SetStateAction<File[]>>;
}) => {
  const { file, setUploadList } = props;
  const filetype = file.name.split(".").pop() as string;

  const [url, setUrl] = useState<string>();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async () => {
      const data = new FormData();
      data.append("file", file);
      const res = await axios.put(
        `${process.env.NEXT_PUBLIC_ELYSIA}/techniques/file-upload`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = progressEvent.progress;
            if (percentCompleted) {
              setProgress(percentCompleted);
            }
          },
        },
      );
      return res.data;
    },
    onSuccess: () => {
      setProgress(1);
      /**
       * remove the uploaded file from the list
       * note that the files are uploaded asynchronously,
       * so it's necessary to update the list based on its previous state,
       * because if another file is uploaded before the current file is uploaded,
       * the current state of the list will be out of sync with the actual files
       */
      setUploadList((prev) => {
        return prev.filter((item) => item.name !== file.name);
      });
      /* update the display list */
      queryClient.invalidateQueries({
        queryKey: [UploadFilesQK.GET_PREVIEW_FILELIST],
      });
    },
  });

  useEffect(() => {
    if (file) {
      setUrl(URL.createObjectURL(file));
      mutation.mutate();
    }
  }, [file, mutation.mutate]);

  return (
    <div>
      <Square>
        {url ? (
          <>
            {isImageType(filetype) ? (
              <img
                src={url}
                alt={file.name}
                className={`w-full object-cover h-full${progress === 1 ? "opacity-100" : "opacity-50"}`}
              />
            ) : isVideoType(filetype) ? (
              <video
                src={url}
                className={`w-full object-cover h-full${progress === 1 ? "opacity-100" : "opacity-50"}`}
              >
                <track kind="captions" />
              </video>
            ) : (
              /* unknown file type */
              <div className={progress === 1 ? "opacity-100" : "opacity-50"}>
                <UnknownFileTypeIcon title={file.name} size={100} />
              </div>
            )}
            <div className="absolute right-0 bottom-0 left-0 h-1">
              <div
                className={`h-full bg-sky-400 ${progress === 1 && "hidden"}`}
                style={{
                  width: `${progress * 100}%`,
                }}
              />
            </div>
          </>
        ) : (
          <ItemLoading />
        )}
      </Square>
      <div
        title={file.name}
        className="cursor-default overflow-hidden text-ellipsis whitespace-nowrap text-sm text-white/50"
      >
        {file.name}
      </div>
    </div>
  );
};
