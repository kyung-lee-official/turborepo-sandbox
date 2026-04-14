import type { MedusaRequest } from "@medusajs/framework";

/**
 * Read UTF-8 body when `bodyParser: false` left the stream unread
 * (Hosted Checkout `noticeUrl` XML).
 */
export function readMedusaRequestBodyUtf8(req: MedusaRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}
