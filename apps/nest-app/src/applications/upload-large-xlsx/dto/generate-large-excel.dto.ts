import { z } from "zod";

export const generateLargeExcelBodySchema = z.object({
  fileType: z.enum(["valid", "invalid"]).default("valid"),
});

export type GenerateLargeExcelBodyDto = z.infer<
  typeof generateLargeExcelBodySchema
>;

export type GenerateLargeExcelResult = {
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
