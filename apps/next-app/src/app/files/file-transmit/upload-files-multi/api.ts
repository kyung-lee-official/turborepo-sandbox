import { elysiaBaseUrl } from "@/lib/api-base-url";
import { get } from "@/lib/fetcher";

const apiBaseUrl = elysiaBaseUrl();

export enum UploadFilesQK {
  GET_PREVIEW_FILELIST = "get-preview-filelist",
  GET_FILE_BLOB = "get-file-blob",
}

export const getAttachmentListByEventId = async () => {
  return get<unknown[]>("/techniques/preview-filelist", {
    baseURL: apiBaseUrl,
  });
};

export const getFileBlob = async (name: string) => {
  return get<Blob>(`/techniques/preview-image/${name}`, {
    baseURL: apiBaseUrl,
    responseType: "blob",
  });
};
