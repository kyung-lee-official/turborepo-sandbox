import { ApiBodyOptions, type ApiOperationOptions } from "@nestjs/swagger";

export const uploadFilesApiOperationOptions: ApiOperationOptions = {
  summary: "Upload an array of files (identified with a single field name)",
  description: `# Upload an array of files (identified with a single field name) to the server
File saved to ./file-uploads/`,
};

// export const uploadFilesApiBodyOptions: ApiBodyOptions = {
// };
