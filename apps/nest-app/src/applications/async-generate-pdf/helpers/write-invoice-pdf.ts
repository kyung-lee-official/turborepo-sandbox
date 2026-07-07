import { writeFile } from "node:fs/promises";

import PDFDocument = require("pdfkit");

import type { AsyncGeneratePdfInfoRow } from "../async-generate-pdf.mock-data";

const TERMS_PARAGRAPHS = [
  "Payment is due within thirty calendar days of the invoice date unless a separate agreement states otherwise.",
  "Late balances may incur finance charges and can trigger service suspension after repeated reminders.",
  "All usage metrics are measured from platform telemetry and reconciled against contract entitlements.",
  "Disputed line items must be reported in writing within ten business days of invoice delivery.",
] as const;

function writeLineItemsTable(
  doc: InstanceType<typeof PDFDocument>,
  row: AsyncGeneratePdfInfoRow,
): void {
  doc.fontSize(11).text("Line items", { underline: true });
  doc.moveDown(0.5);

  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  for (const item of row.lineItems) {
    const lineTotal = (
      item.quantity * Number.parseFloat(item.unitPrice)
    ).toFixed(2);

    doc
      .fontSize(10)
      .text(
        `${item.sku} · qty ${item.quantity} · unit ${item.unitPrice} · total ${lineTotal}`,
      );
    doc.fontSize(9).fillColor("#333333").text(item.description, {
      width: contentWidth,
    });
    doc.fillColor("#000000");
    doc.moveDown(0.25);
  }

  doc.moveDown();
}

function writeAuditAppendix(
  doc: InstanceType<typeof PDFDocument>,
  row: AsyncGeneratePdfInfoRow,
): void {
  doc.addPage();
  doc.fontSize(12).text("Audit appendix", { underline: true });
  doc.moveDown();

  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  for (const entry of row.auditEntries) {
    doc.fontSize(8).text(entry, { width: contentWidth });
    doc.moveDown(0.2);
  }
}

function writeTermsSection(doc: InstanceType<typeof PDFDocument>): void {
  doc.addPage();
  doc.fontSize(12).text("Terms and audit notes", { underline: true });
  doc.moveDown();

  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  for (const paragraph of TERMS_PARAGRAPHS) {
    doc.fontSize(10).text(paragraph, { width: contentWidth });
    doc.moveDown();
  }
}

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
  doc.text(`Line item count: ${row.lineItems.length}`);
  doc.text(`Audit entry count: ${row.auditEntries.length}`);
  doc.moveDown();
  writeLineItemsTable(doc, row);
  writeAuditAppendix(doc, row);
  writeTermsSection(doc);
}

export async function buildInvoicePdfBuffer(
  row: AsyncGeneratePdfInfoRow,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
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
