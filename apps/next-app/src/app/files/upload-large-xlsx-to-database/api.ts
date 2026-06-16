import axios from "axios";
import type { Task, UploadFileResponse, UploadProgressCallback } from "./types";

export enum UploadLargeXlsxToDatabaseQK {
  GET_TASKS = "get_tasks",
  GET_TASK_BY_ID = "get_task_by_id",
}

/* Upload file to application endpoint */
export const uploadLargeXlsxFile = async (
  file: File,
  onProgress?: UploadProgressCallback,
): Promise<UploadFileResponse> => {
  /* Create FormData to handle file upload */
  const formData = new FormData();
  formData.append("file", file);

  /* Make the upload request */
  const res = await axios.post<UploadFileResponse>(
    "/applications/upload-large-xlsx/upload",
    formData,
    {
      baseURL: process.env.NEXT_PUBLIC_NESTJS,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      /* Progress tracking */
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            progress,
          });
        }
      },
      /* Timeout for large files (5 mins) */
      timeout: 5 * 60 * 1000,
    },
  );

  return res.data;
};

export const getTaskList = async (page?: number): Promise<Task[]> => {
  const params = new URLSearchParams();
  if (page !== undefined) {
    params.append("page", page.toString());
  }

  const res = await axios.get<Task[]>(
    `/applications/upload-large-xlsx/tasks?${params.toString()}`,
    {
      baseURL: process.env.NEXT_PUBLIC_NESTJS,
    },
  );
  return res.data;
};

export const deleteTaskById = async (taskId: string) => {
  const res = await axios.delete(
    `/applications/upload-large-xlsx/delete-task-by-id/${taskId}`,
    {
      baseURL: process.env.NEXT_PUBLIC_NESTJS,
    },
  );
  return res.data;
};

export const downloadTaskErrors = async (
  taskId: number,
): Promise<ArrayBuffer> => {
  const res = await axios.get(
    `/applications/upload-large-xlsx/get-validation-errors-by-task-id/${taskId}`,
    {
      baseURL: process.env.NEXT_PUBLIC_NESTJS,
      responseType: "arraybuffer",
    },
  );
  return res.data;
};

export type GenerateLargeExcelResponse = {
  success: true;
  filename: string;
  filepath: string;
  fileType: "valid" | "invalid";
  rows: number;
  fileSizeMB: string;
  generationTimeMs: number;
  writeTimeMs: number;
  totalTimeMs: number;
};

export const generateLargeExcelFile = async (
  fileType: "valid" | "invalid",
): Promise<GenerateLargeExcelResponse> => {
  const res = await axios.post<GenerateLargeExcelResponse>(
    "/applications/upload-large-xlsx/generate-large-excel",
    { fileType },
    {
      baseURL: process.env.NEXT_PUBLIC_NESTJS,
      headers: { "Content-Type": "application/json" },
      timeout: 10 * 60 * 1000,
    },
  );
  return res.data;
};
