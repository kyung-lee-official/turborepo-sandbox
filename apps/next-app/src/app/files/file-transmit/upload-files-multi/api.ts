import axios from "axios";
import { elysiaBaseUrl } from "@/lib/api-base-url";

const apiBaseUrl = elysiaBaseUrl();

export enum UploadFilesQK {
  GET_PREVIEW_FILELIST = "get-preview-filelist",
  GET_FILE_BLOB = "get-file-blob",
}

export const getAttachmentListByEventId = async () => {
  const res = await axios.get<any>("/techniques/preview-filelist", {
    baseURL: apiBaseUrl,
  });
  return res.data;
};

export const getFileBlob = async (name: string) => {
  const res = await axios.get(`/techniques/preview-image/${name}`, {
    baseURL: apiBaseUrl,
    responseType: "blob",
  });
  return res.data;
};
