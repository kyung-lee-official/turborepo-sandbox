import { createWriteStream } from "node:fs";
import { rm } from "node:fs/promises";
import { finished } from "node:stream/promises";
import { ZipArchive } from "archiver";

export async function zipDirectory(
  sourceDir: string,
  zipFilePath: string,
): Promise<void> {
  const output = createWriteStream(zipFilePath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  const archiveClosed = finished(output);
  archive.pipe(output);
  archive.directory(sourceDir, false);
  await archive.finalize();
  await archiveClosed;
}

export async function removeDirectory(sourceDir: string): Promise<void> {
  await rm(sourceDir, { recursive: true, force: true });
}
