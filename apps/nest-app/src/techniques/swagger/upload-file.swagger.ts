import type { ApiBodyOptions, ApiOperationOptions } from "@nestjs/swagger";

export const uploadFileApiOperationOptions: ApiOperationOptions = {
  summary: "Upload a file",
  description: `# Upload a file to the server
File saved to ./file-uploads/`,
};

export const uploadFileApiBodyOptions: ApiBodyOptions = {
  schema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        format: "binary",
      },
    },
  },
};
