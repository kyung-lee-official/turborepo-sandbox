import { z } from "zod";

export const CreateUploadLargeXlsxSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.string().min(1, "Gender is required and cannot be empty"),
  bioId: z.string().min(1, "Bio ID is required"),
});

export type CreateUploadLargeXlsxDto = z.infer<
  typeof CreateUploadLargeXlsxSchema
>;
