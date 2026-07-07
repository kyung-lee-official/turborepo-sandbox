import { writeFile } from "node:fs/promises";

import PDFDocument = require("pdfkit");

import type { AsyncGeneratePdfInfoRow } from "../async-generate-pdf.mock-data";

function writeInvoiceContent(
  doc: InstanceType<typeof PDFDocument>,
  row: AsyncGeneratePdfInfoRow,
): void {
  doc.fontSize(20).text("Invoice", { align: "center" });
  doc.moveDown();
  doc.fontSize(12);
  doc.text(`Name: ${row.name}`);
  doc.text(`Email: ${row.email}`);
  doc.text(`Age: ${row.age}`);
  doc.text(`Gender: ${row.gender}`);
  doc.text(`Invoice date: ${row.invoiceDate}`);
}

export async function buildInvoicePdfBuffer(
  row: AsyncGeneratePdfInfoRow,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);

    writeInvoiceContent(doc, row);
    doc.end();
  });
}

export async function saveInvoicePdfBuffer(
  filePath: string,
  buffer: Buffer,
): Promise<void> {
  await writeFile(filePath, buffer);
}

export function pdfFileNameFromEmail(email: string): string {
  const safeBase = email.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return `${safeBase}.pdf`;
}
