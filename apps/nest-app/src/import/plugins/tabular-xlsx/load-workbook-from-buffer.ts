import type { Readable } from "node:stream";
import * as ExcelJS from "exceljs";

export async function loadWorkbookFromBuffer(
  buffer: Buffer,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

export async function readStreamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function loadWorkbookFromStream(
  stream: Readable,
): Promise<ExcelJS.Workbook> {
  const buffer = await readStreamToBuffer(stream);
  return loadWorkbookFromBuffer(buffer);
}
