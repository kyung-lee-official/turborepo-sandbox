import type { ApiBodyOptions, ApiOperationOptions } from "@nestjs/swagger";

export const generateLargeExcelApiOperation: ApiOperationOptions = {
  summary: "Generate large test XLSX file",
  description:
    "Generate a 500k-row mock Excel file (valid or invalid data) saved under nest-app/temp",
};

export const generateLargeExcelApiBody: ApiBodyOptions = {
  description: "File type to generate",
  required: true,
  schema: {
    type: "object",
    properties: {
      fileType: {
        type: "string",
        enum: ["valid", "invalid"],
        default: "valid",
      },
    },
    required: ["fileType"],
  },
};
