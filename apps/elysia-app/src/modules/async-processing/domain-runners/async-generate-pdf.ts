import { mkdir, stat } from "node:fs/promises";
import {
  VFR_TO_CFR_DOMAIN_KIND,
  VFR_TO_CFR_SOURCE_IDS,
} from "../../vfr-to-cfr/constants.ts";
import {
  probeMediaDurationSeconds,
  probeVideoInfo,
} from "../../vfr-to-cfr/probe-video-info.ts";
import { runFfmpegVfrToCfr } from "../../vfr-to-cfr/run-ffmpeg-cfr.ts";
import {
  buildOutputMetadataPath,
  buildOutputVideoPath,
  buildUploadedVideoPath,
  getOutputDir,
} from "../../vfr-to-cfr/storage-paths.ts";
import {
  buildOutputMetadataMarkdown,
  computeFileSha256Hex,
  writeMetadataMarkdown,
} from "../../vfr-to-cfr/video-metadata.ts";
import type {
  DomainRunner,
  DomainRunnerIo,
  DomainRunResult,
  VerifiedProcessingSource,
} from "../types.ts";

function readContextString(
  context: Record<string, unknown> | undefined,
  key: string,
): string {
  const value = context?.[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required in manifest context`);
  }
  return value.trim();
}

function readContextNumber(
  context: Record<string, unknown> | undefined,
  key: string,
): number {
  const value = context?.[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${key} is required in manifest context`);
  }
  return value;
}

export const asyncGeneratePdfDomainRunner: DomainRunner = {
  domainKind: VFR_TO_CFR_DOMAIN_KIND,

  async run(
    jobId: string,
    sources: Map<string, VerifiedProcessingSource>,
    io: DomainRunnerIo,
  ): Promise<DomainRunResult> {
    const context = io.context as Record<string, unknown> | undefined;
    const uploadId = readContextString(context, "uploadId");
    const outputId = readContextString(context, "outputId");
    const targetFps = readContextNumber(context, "targetFps");

    const video = sources.get(VFR_TO_CFR_SOURCE_IDS.video);
    if (!video) {
      throw new Error("Missing required source: video");
    }

    if (video.verifiedLocator.kind !== "local") {
      throw new Error(
        "vfr-to-cfr demo only supports local sources (got object)",
      );
    }

    const inputPath = video.verifiedLocator.path;
    const expectedUploadPath = buildUploadedVideoPath(uploadId);
    if (inputPath !== expectedUploadPath) {
      throw new Error(
        `Upload path mismatch: expected ${expectedUploadPath}, got ${inputPath}`,
      );
    }

    const outputPath = buildOutputVideoPath(outputId);
    await mkdir(getOutputDir(), { recursive: true });

    await io.onProgress({
      phase: "probing",
      detail: uploadId,
      percent: 0,
    });

    const durationSeconds = await probeMediaDurationSeconds(inputPath);

    await io.onProgress({
      phase: "converting",
      detail: `ffmpeg → ${targetFps} fps CFR`,
      percent: 0,
    });

    await runFfmpegVfrToCfr({
      inputPath,
      outputPath,
      fps: targetFps,
      durationSeconds,
      onProgress: async ({
        percent,
        detail,
      }: {
        percent: number | null;
        detail: string;
      }) => {
        await io.onProgress({
          phase: "converting",
          detail,
          percent,
        });
      },
    });

    const [sha256, probe, fileStat] = await Promise.all([
      computeFileSha256Hex(outputPath),
      probeVideoInfo(outputPath),
      stat(outputPath),
    ]);
    const createdAt = new Date().toISOString();

    await writeMetadataMarkdown(
      buildOutputMetadataPath(outputId),
      buildOutputMetadataMarkdown({
        kind: "output",
        id: outputId,
        sourceUploadId: uploadId,
        jobId,
        targetFps,
        sha256,
        sizeBytes: fileStat.size,
        createdAt,
        probe,
      }),
    );

    await io.onProgress({
      phase: "done",
      detail: outputId,
      percent: 100,
    });

    return {
      outcome: "success",
      processedCount: 1,
      errorCount: 0,
    };
  },
};
