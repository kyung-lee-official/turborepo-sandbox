import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Elysia, status, t } from "elysia";
import ExcelJS from "exceljs";
import * as pako from "pako";

const fileUploadsDir = join(process.cwd(), "file-uploads");
const fileDownloadsDir = join(process.cwd(), "file-downloads");
const downloadExample = join(fileDownloadsDir, "download-example.png");

type ArchiveFile = {
  purpose: string;
  name: string;
  data: number[];
};

async function ensureFileUploadsDir(): Promise<void> {
  await mkdir(fileUploadsDir, { recursive: true });
}

async function saveFile(file: File): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(fileUploadsDir, file.name), buffer);
}

async function saveFiles(files: File[]): Promise<void> {
  for (const file of files) {
    await saveFile(file);
  }
}

async function requireGzippedFile(file: File | undefined): Promise<File> {
  if (!file) {
    throw status(400, { error: "No file uploaded" });
  }
  if (file.type !== "application/gzip") {
    throw status(400, { error: "File must be gzipped" });
  }
  return file;
}

async function processCompressedArchive(file: File): Promise<{
  status: "ok";
}> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const decompressed = pako.ungzip(buffer, { to: "string" });
  const archiveFiles: ArchiveFile[] = JSON.parse(decompressed);

  for (const entry of archiveFiles) {
    const fileBuffer = Buffer.from(entry.data);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const sheetNames = workbook.worksheets.map((sheet) => sheet.name);
    console.log(entry.name, sheetNames);
  }

  return { status: "ok" };
}

export const techniquesRoutes = new Elysia({ prefix: "/techniques" })
  .put(
    "/file-upload",
    async ({ body }) => {
      await ensureFileUploadsDir();
      await saveFile(body.file);
      return { success: true };
    },
    { body: t.Object({ file: t.File() }) },
  )
  .put(
    "/files-upload-array",
    async ({ body }) => {
      await ensureFileUploadsDir();
      await saveFiles(body.files);
      return { success: true };
    },
    { body: t.Object({ files: t.Array(t.File()) }) },
  )
  .put(
    "/files-upload-any",
    async ({ body }) => {
      await ensureFileUploadsDir();
      await saveFiles(body.files);
      return { success: true };
    },
    { body: t.Object({ files: t.Array(t.File()) }) },
  )
  .get("/file-download", async ({ set }) => {
    const buffer = await readFile(downloadExample);
    set.headers = {
      "Content-Type": "image/png",
      "Content-Disposition": 'attachment; filename="download-example.png"',
    };
    return buffer;
  })
  .get("/conditionally-download-json-or-buffer", async ({ set }) => {
    const returnJson = Math.random() < 0.5;
    if (returnJson) {
      set.status = 200;
      return { message: "success" };
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("My Sheet");
    sheet.getCell("A1").value = "an error found at line 23";
    sheet.getCell("A2").value = "an error found at line 28";
    const fileBuffer = await workbook.xlsx.writeBuffer();
    set.status = 422;
    set.headers = {
      "X-Error-Message": "Validation errors found in the uploaded file",
      "X-Error-Code": "VALIDATION_FAILED",
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="error-report.xlsx"',
    };
    return Buffer.from(fileBuffer);
  })
  .get("/preview-filelist", async () => {
    await ensureFileUploadsDir();
    const items = await readdir(fileUploadsDir);
    const idx = items.indexOf(".gitkeep");
    if (idx !== -1) items.splice(idx, 1);
    return items.map((name) => ({ name }));
  })
  .get("/preview-image/:filename", async ({ params, set }) => {
    const buffer = await readFile(join(fileUploadsDir, params.filename));
    set.headers = { "Content-Type": "application/octet-stream" };
    return buffer;
  })
  .delete("/delete-file/:filename", async ({ params }) => {
    await unlink(join(fileUploadsDir, params.filename));
    return { success: true };
  })
  .post(
    "/upload-compressed-single-blob",
    async ({ body }) => {
      const file = await requireGzippedFile(body.compressed_archive);
      try {
        const result = await processCompressedArchive(file);
        return {
          success: true,
          message: "Files processed successfully",
          data: result,
        };
      } catch (error) {
        throw status(
          400,
          `Failed to process archive: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
    { body: t.Object({ compressed_archive: t.File() }) },
  )
  .post(
    "/upload-compressed-single-blob-single-input",
    async ({ body }) => {
      console.log("description:", body.description);
      const file = await requireGzippedFile(body.compressed_archive);
      try {
        const result = await processCompressedArchive(file);
        return {
          success: true,
          message: "Files processed successfully",
          data: result,
        };
      } catch (error) {
        throw status(
          400,
          `Failed to process archive: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
    {
      body: t.Object({
        compressed_archive: t.File(),
        description: t.String(),
      }),
    },
  );
