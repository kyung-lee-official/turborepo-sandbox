import type { Readable as NodeReadable } from "node:stream";
import * as ExcelJS from "exceljs";

export async function loadWorkbookFromBuffer(
  buffer: Buffer,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

/**
 * Accept either Node.js Readable or Web ReadableStream (bun returns the latter
 * from worker_threads ReadableStream under `node:stream` typings). Coerce to
 * AsyncIterable<Buffer> via duck typing to avoid the ReadableStream type
 * mismatch.
 */
export async function readStreamToBuffer(
  stream: NodeReadable | ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const iterable = stream as unknown as AsyncIterable<Uint8Array | Buffer>;
  for await (const chunk of iterable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
