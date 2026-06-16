import axios from "axios";

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
