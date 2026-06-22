import { unlink } from "node:fs/promises";

export async function rollbackSavedPaths(
  savedPaths: readonly string[],
): Promise<void> {
  await Promise.all(
    savedPaths.map(async (path) => {
      try {
        await unlink(path);
      } catch {
        // best effort
      }
    }),
  );
}
