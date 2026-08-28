import { access, mkdir, readdir, stat, unlink } from "node:fs/promises";
import { Elysia, status, t } from "elysia";
import { nanoid } from "nanoid";
import {
  resolveVfrToCfrMaxUploadBytes,
  VFR_TO_CFR_DEFAULT_FPS,
  VFR_TO_CFR_DOMAIN_KIND,
  VFR_TO_CFR_TARGET_FPS_PRESETS,
} from "./constants.ts";
import { probeVideoInfo } from "./probe-video-info.ts";
import {
  buildOutputMetadataPath,
  buildOutputVideoPath,
  buildUploadedMetadataPath,
  buildUploadedVideoPath,
  getOutputDir,
  getUploadedDir,
  getVfrToCfrBaseDir,
} from "./storage-paths.ts";
import type { UploadVideoResult, VideoDetail, VideoListItem } from "./types.ts";
import {
  buildUploadedMetadataMarkdown,
  computeFileSha256Hex,
  parseCreatedAtFromMarkdown,
  parseDurationFromMarkdown,
  parseOriginalNameFromMarkdown,
  parseSha256FromMarkdown,
  parseSizeBytesFromMarkdown,
  readMetadataMarkdown,
  writeMetadataMarkdown,
} from "./video-metadata.ts";

function parseFrameRateToFps(raw: string | null): number | null {
  if (!raw || raw === "0/0") {
    return null;
  }
  if (raw.includes("/")) {
    const [numText, denText] = raw.split("/");
    const num = Number(numText);
    const den = Number(denText);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
      return null;
    }
    const fps = num / den;
    return fps > 0 ? fps : null;
  }
  const fps = Number(raw);
  return Number.isFinite(fps) && fps > 0 ? fps : null;
}

async function ensureStorageDirs(): Promise<void> {
  await mkdir(getUploadedDir(), { recursive: true });
  await mkdir(getOutputDir(), { recursive: true });
}

async function listVideosInDir(
  dir: string,
  kind: "uploaded" | "output",
): Promise<VideoListItem[]> {
  const entries = await readdir(dir);
  const ids = entries
    .filter((name) => name.endsWith(".mp4"))
    .map((name) => name.replace(/\.mp4$/i, ""));

  const items = await Promise.all(
    ids.map(async (id) => {
      try {
        return await getVideoDetail(id, kind);
      } catch {
        return null;
      }
    }),
  );

  return items
    .filter((item): item is VideoDetail => item != null)
    .map(
      ({
        metadataMarkdown: _metadataMarkdown,
        avgFrameRate: _avgFrameRate,
        avgFrameRateFps: _avgFrameRateFps,
        suggestedTargetFps: _suggestedTargetFps,
        ...summary
      }) => summary,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function getVideoDetail(
  id: string,
  kind: "uploaded" | "output",
): Promise<VideoDetail> {
  const videoPath =
    kind === "uploaded" ? buildUploadedVideoPath(id) : buildOutputVideoPath(id);
  const metadataPath =
    kind === "uploaded"
      ? buildUploadedMetadataPath(id)
      : buildOutputMetadataPath(id);

  try {
    await access(videoPath);
  } catch {
    throw status(404, { error: `${kind} video not found: ${id}` });
  }

  const [fileStat, metadataMarkdown] = await Promise.all([
    stat(videoPath),
    readMetadataMarkdown(metadataPath).catch(() => ""),
  ]);

  const sha256 =
    parseSha256FromMarkdown(metadataMarkdown) ??
    (await computeFileSha256Hex(videoPath));
  const createdAt =
    parseCreatedAtFromMarkdown(metadataMarkdown) ??
    fileStat.mtime.toISOString();
  const durationSeconds = parseDurationFromMarkdown(metadataMarkdown);
  const sizeBytes =
    parseSizeBytesFromMarkdown(metadataMarkdown) ?? fileStat.size;

  const label =
    kind === "uploaded"
      ? (parseOriginalNameFromMarkdown(metadataMarkdown) ?? `${id}.mp4`)
      : `cfr-${id}.mp4`;

  const probeFields =
    kind === "uploaded"
      ? await (async () => {
          const probe = await probeVideoInfo(videoPath);
          const avgFrameRateFps = parseFrameRateToFps(probe.avgFrameRate);
          return {
            avgFrameRate: probe.avgFrameRate,
            avgFrameRateFps,
            suggestedTargetFps: avgFrameRateFps,
          };
        })()
      : {};

  return {
    id,
    kind,
    label,
    sizeBytes,
    sha256,
    createdAt,
    durationSeconds,
    metadataMarkdown,
    ...probeFields,
  };
}

async function deleteVideoPair(
  id: string,
  kind: "uploaded" | "output",
): Promise<void> {
  const videoPath =
    kind === "uploaded" ? buildUploadedVideoPath(id) : buildOutputVideoPath(id);
  const metadataPath =
    kind === "uploaded"
      ? buildUploadedMetadataPath(id)
      : buildOutputMetadataPath(id);

  try {
    await access(videoPath);
  } catch {
    throw status(404, { error: `${kind} video not found: ${id}` });
  }

  await Promise.all([
    unlink(videoPath),
    unlink(metadataPath).catch(() => undefined),
  ]);
}

export const vfrToCfrRoutes = new Elysia({ prefix: "/vfr-to-cfr" })
  .get("/", () => ({
    module: "vfr-to-cfr",
    domainKind: VFR_TO_CFR_DOMAIN_KIND,
    baseDir: getVfrToCfrBaseDir(),
    uploadedDir: getUploadedDir(),
    outputDir: getOutputDir(),
    maxUploadBytes: resolveVfrToCfrMaxUploadBytes(),
    maxUploadBytesEnv: "VFR_TO_CFR_UPLOAD_MAX_BYTES",
    targetFpsPresets: [...VFR_TO_CFR_TARGET_FPS_PRESETS],
    defaultTargetFps: VFR_TO_CFR_DEFAULT_FPS,
    endpoints: [
      "POST /vfr-to-cfr/uploaded",
      "GET /vfr-to-cfr/uploaded",
      "GET /vfr-to-cfr/uploaded/:id",
      "DELETE /vfr-to-cfr/uploaded/:id",
      "POST /vfr-to-cfr/uploaded/:id/convert (pending async-processing port)",
      "GET /vfr-to-cfr/output",
      "GET /vfr-to-cfr/output/:id",
      "DELETE /vfr-to-cfr/output/:id",
      "GET /vfr-to-cfr/output/:id/download",
    ],
  }))
  .post(
    "/uploaded",
    async ({ body, set }) => {
      set.status = 201;
      const file = body.video;
      if (!file) {
        throw status(400, { error: 'Missing video file (form field "video")' });
      }
      if (!file.name.toLowerCase().endsWith(".mp4")) {
        throw status(400, { error: "Only .mp4 files are supported" });
      }

      const id = nanoid();
      const destPath = buildUploadedVideoPath(id);
      await ensureStorageDirs();
      await Bun.write(destPath, file);
      const fileStat = await stat(destPath);
      const sha256 = await computeFileSha256Hex(destPath);
      const probe = await probeVideoInfo(destPath);
      const createdAt = new Date().toISOString();

      await writeMetadataMarkdown(
        buildUploadedMetadataPath(id),
        buildUploadedMetadataMarkdown({
          kind: "uploaded",
          id,
          originalName: file.name,
          sha256,
          sizeBytes: fileStat.size,
          createdAt,
          probe,
        }),
      );

      const result: UploadVideoResult = {
        id,
        label: file.name,
        sizeBytes: fileStat.size,
        sha256,
        createdAt,
        durationSeconds: probe.durationSeconds,
      };
      return result;
    },
    { body: t.Object({ video: t.File() }) },
  )
  .get("/uploaded", async () => {
    await ensureStorageDirs();
    return await listVideosInDir(getUploadedDir(), "uploaded");
  })
  .get("/uploaded/:id", async ({ params }) => {
    return await getVideoDetail(params.id, "uploaded");
  })
  .delete("/uploaded/:id", async ({ params, set }) => {
    await deleteVideoPair(params.id, "uploaded");
    set.status = 204;
  })
  .post("/uploaded/:id/convert", () => {
    throw status(501, {
      error:
        "vfr-to-cfr convert is pending async-processing port. Use nest-app /vfr-to-cfr/uploaded/:id/convert in the meantime.",
    });
  })
  .get("/output", async () => {
    await ensureStorageDirs();
    return await listVideosInDir(getOutputDir(), "output");
  })
  .get("/output/:id", async ({ params }) => {
    return await getVideoDetail(params.id, "output");
  })
  .delete("/output/:id", async ({ params, set }) => {
    await deleteVideoPair(params.id, "output");
    set.status = 204;
  })
  .get("/output/:id/download", async ({ params, set }) => {
    const outputPath = buildOutputVideoPath(params.id);
    try {
      await access(outputPath);
    } catch {
      throw status(404, { error: `Output video not found: ${params.id}` });
    }
    const buffer = await Bun.file(outputPath).arrayBuffer();
    set.headers = {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="cfr-${params.id}.mp4"`,
    };
    return new Uint8Array(buffer);
  });
