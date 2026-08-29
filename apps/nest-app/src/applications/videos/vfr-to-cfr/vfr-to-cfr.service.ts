import { createReadStream } from "node:fs";
import { access, mkdir, readdir, stat, unlink } from "node:fs/promises";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  StreamableFile,
} from "@nestjs/common";
import { type ConvertUploadedBody } from "./convert-options.schema";
import {
  parseFrameRateToFps,
  suggestTargetFpsFromAverageFrameRate,
} from "./helpers/parse-frame-rate";
import { probeVideoInfo } from "./helpers/probe-video-info";
import {
  buildOutputMetadataPath,
  buildOutputVideoPath,
  buildUploadedMetadataPath,
  buildUploadedVideoPath,
  getOutputDir,
  getUploadedDir,
  getVfrToCfrBaseDir,
} from "./helpers/storage-paths";
import {
  buildUploadedMetadataMarkdown,
  computeFileSha256Hex,
  parseCreatedAtFromMarkdown,
  parseDurationFromMarkdown,
  parseOriginalNameFromMarkdown,
  parseSha256FromMarkdown,
  parseSizeBytesFromMarkdown,
  parseSourceUploadIdFromMarkdown,
  readMetadataMarkdown,
  writeMetadataMarkdown,
} from "./helpers/video-metadata";
import {
  resolveVfrToCfrMaxUploadBytes,
  VFR_TO_CFR_DEFAULT_FPS,
  VFR_TO_CFR_DOMAIN_KIND,
  VFR_TO_CFR_TARGET_FPS_PRESETS,
  VFR_TO_CFR_UPLOAD_MAX_BYTES_ENV,
} from "./vfr-to-cfr.constants";
import type {
  ConvertVideoResult,
  UploadVideoResult,
  VideoDetail,
  VideoListItem,
} from "./vfr-to-cfr.types";

@Injectable()
export class VfrToCfrService {
  constructor() {}

  async ensureStorageDirs(): Promise<void> {
    await mkdir(getUploadedDir(), { recursive: true });
    await mkdir(getOutputDir(), { recursive: true });
  }

  getTemplateInfo() {
    return {
      module: "vfr-to-cfr",
      domainKind: VFR_TO_CFR_DOMAIN_KIND,
      baseDir: getVfrToCfrBaseDir(),
      uploadedDir: getUploadedDir(),
      outputDir: getOutputDir(),
      maxUploadBytes: resolveVfrToCfrMaxUploadBytes(),
      maxUploadBytesEnv: VFR_TO_CFR_UPLOAD_MAX_BYTES_ENV,
      targetFpsPresets: [...VFR_TO_CFR_TARGET_FPS_PRESETS],
      defaultTargetFps: VFR_TO_CFR_DEFAULT_FPS,
      endpoints: [
        "POST /vfr-to-cfr/uploaded",
        "GET /vfr-to-cfr/uploaded",
        "GET /vfr-to-cfr/uploaded/:id",
        "DELETE /vfr-to-cfr/uploaded/:id",
        "POST /vfr-to-cfr/uploaded/:id/convert",
        "GET /vfr-to-cfr/output",
        "GET /vfr-to-cfr/output/:id",
        "DELETE /vfr-to-cfr/output/:id",
        "GET /vfr-to-cfr/output/:id/download",
        "GET /jobs/:jobId/events",
      ],
    };
  }

  async registerUploadedVideo(
    file: Express.Multer.File,
  ): Promise<UploadVideoResult> {
    if (!file.originalname.toLowerCase().endsWith(".mp4")) {
      throw new BadRequestException("Only .mp4 files are supported");
    }

    const id = file.filename.replace(/\.mp4$/i, "");
    const videoPath = buildUploadedVideoPath(id);
    const fileStat = await stat(videoPath);
    const sha256 = await computeFileSha256Hex(videoPath);
    const probe = await probeVideoInfo(videoPath);
    const createdAt = new Date().toISOString();

    await writeMetadataMarkdown(
      buildUploadedMetadataPath(id),
      buildUploadedMetadataMarkdown({
        kind: "uploaded",
        id,
        originalName: file.originalname,
        sha256,
        sizeBytes: fileStat.size,
        createdAt,
        probe,
      }),
    );

    return {
      id,
      label: file.originalname,
      sizeBytes: fileStat.size,
      sha256,
      createdAt,
      durationSeconds: probe.durationSeconds,
    };
  }

  async listUploaded(): Promise<VideoListItem[]> {
    await this.ensureStorageDirs();
    return this.listVideosInDir(getUploadedDir(), "uploaded");
  }

  async listOutput(): Promise<VideoListItem[]> {
    await this.ensureStorageDirs();
    return this.listVideosInDir(getOutputDir(), "output");
  }

  async getUploadedDetail(id: string): Promise<VideoDetail> {
    return this.getVideoDetail(id, "uploaded");
  }

  async getOutputDetail(id: string): Promise<VideoDetail> {
    return this.getVideoDetail(id, "output");
  }

  async deleteUploaded(id: string): Promise<void> {
    await this.deleteVideoPair(id, "uploaded");
  }

  async deleteOutput(id: string): Promise<void> {
    await this.deleteVideoPair(id, "output");
  }

  async startConvert(
    uploadId: string,
    _rawOptions: unknown = {},
  ): Promise<ConvertVideoResult> {
    throw new ServiceUnavailableException(
      "vfr-to-cfr convert moved to Elysia; nest version is read-only.",
    );
  }

  private async resolveTargetFps(
    videoPath: string,
    options: ConvertUploadedBody,
  ): Promise<number> {
    if (options.targetFps != null && options.matchSourceAverage !== true) {
      return options.targetFps;
    }

    const probe = await probeVideoInfo(videoPath);
    return (
      suggestTargetFpsFromAverageFrameRate(probe.avgFrameRate) ??
      VFR_TO_CFR_DEFAULT_FPS
    );
  }

  async downloadOutput(outputId: string): Promise<StreamableFile> {
    const outputPath = buildOutputVideoPath(outputId);
    try {
      await access(outputPath);
    } catch {
      throw new NotFoundException(`Output video not found: ${outputId}`);
    }

    const fileStat = await stat(outputPath);
    const stream = createReadStream(outputPath);

    return new StreamableFile(stream, {
      type: "video/mp4",
      disposition: `attachment; filename="cfr-${outputId}.mp4"`,
      length: fileStat.size,
    });
  }

  private async listVideosInDir(
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
          return await this.getVideoDetail(id, kind);
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

  private async getVideoDetail(
    id: string,
    kind: "uploaded" | "output",
  ): Promise<VideoDetail> {
    const videoPath =
      kind === "uploaded"
        ? buildUploadedVideoPath(id)
        : buildOutputVideoPath(id);
    const metadataPath =
      kind === "uploaded"
        ? buildUploadedMetadataPath(id)
        : buildOutputMetadataPath(id);

    try {
      await access(videoPath);
    } catch {
      throw new NotFoundException(`${kind} video not found: ${id}`);
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

    const sourceUploadId =
      kind === "output"
        ? (parseSourceUploadIdFromMarkdown(metadataMarkdown) ?? undefined)
        : undefined;

    const jobIdMatch = metadataMarkdown.match(
      /\*\*Processing job id:\*\* `([^`]+)`/,
    );
    const jobId = kind === "output" ? jobIdMatch?.[1] : undefined;

    const probeFields =
      kind === "uploaded"
        ? await (async () => {
            const probe = await probeVideoInfo(videoPath);
            const avgFrameRateFps = parseFrameRateToFps(probe.avgFrameRate);
            return {
              avgFrameRate: probe.avgFrameRate,
              avgFrameRateFps,
              suggestedTargetFps: suggestTargetFpsFromAverageFrameRate(
                probe.avgFrameRate,
              ),
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
      sourceUploadId,
      jobId,
      metadataMarkdown,
      ...probeFields,
    };
  }

  private async deleteVideoPair(
    id: string,
    kind: "uploaded" | "output",
  ): Promise<void> {
    const videoPath =
      kind === "uploaded"
        ? buildUploadedVideoPath(id)
        : buildOutputVideoPath(id);
    const metadataPath =
      kind === "uploaded"
        ? buildUploadedMetadataPath(id)
        : buildOutputMetadataPath(id);

    try {
      await access(videoPath);
    } catch {
      throw new NotFoundException(`${kind} video not found: ${id}`);
    }

    await Promise.all([
      unlink(videoPath),
      unlink(metadataPath).catch(() => undefined),
    ]);
  }
}
