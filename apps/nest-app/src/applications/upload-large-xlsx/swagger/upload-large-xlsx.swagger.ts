import type {
  ApiBodyOptions,
  ApiOperationOptions,
  ApiParamOptions,
} from "@nestjs/swagger";

export const uploadXlsxApiOperation: ApiOperationOptions = {
  summary: "Upload XLSX file",
  description: "Upload an XLSX file and process the data into database tasks",
};

export const uploadXlsxApiBody: ApiBodyOptions = {
  description: "Upload XLSX file for processing",
  required: true,
  type: "multipart/form-data",
  schema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        format: "binary",
        description: "XLSX file to upload (accepts .xlsx files only)",
      },
    },
    required: ["file"],
  },
};

export const getTasksApiOperation: ApiOperationOptions = {
  summary: "Get all tasks",
  description: "Retrieve all upload tasks with their data and record counts",
};

export const deleteDataByTaskIdApiOperation: ApiOperationOptions = {
  summary: "Delete data by task ID",
  description:
    "Delete all data entries and the task itself for the specified task ID",
};

export const deleteDataByTaskIdApiParam: ApiParamOptions = {
  name: "taskId",
  type: "number",
  description: "The ID of the task to delete",
};

export const getTaskByIdApiOperation: ApiOperationOptions = {
  summary: "Get task by ID",
  description:
    "Retrieve a specific upload task with its progress, data, and errors",
};

export const getTaskByIdApiParam: ApiParamOptions = {
  name: "taskId",
  type: "number",
  description: "The ID of the task to retrieve",
};

export const getValidationErrorsByTaskIdApiOperation: ApiOperationOptions = {
  summary: "Download validation errors as Excel file",
  description:
    "Get validation errors for a specific task as an Excel file download",
};

export const getValidationErrorsByTaskIdApiParam: ApiParamOptions = {
  name: "taskId",
  type: "number",
  description: "Task ID to get validation errors for",
};
