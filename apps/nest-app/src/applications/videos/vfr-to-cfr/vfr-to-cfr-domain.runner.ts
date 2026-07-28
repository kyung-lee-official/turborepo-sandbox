import { mkdir } from "node:fs/promises";
import { Injectable } from "@nestjs/common";
import type {
  DomainRunner,
  DomainRunnerIo,
  DomainRunResult,
  VerifiedProcessingSource,
} from "@/async-processing/async-processing.types";
import {
  buildVfrToCfrOutputPath,
  getVfrToCfrOutputBaseDir,
} from "./helpers/job-output-paths";
import {
  probeMediaDurationSeconds,
  runFfmpegVfrToCfr,
} from "./helpers/run-ffmpeg-cfr";
import {
  VFR_TO_CFR_DEFAULT_FPS,
  VFR_TO_CFR_DOMAIN_KIND,
  VFR_TO_CFR_SOURCE_IDS,
} from "./vfr-to-cfr.constants";

function localPathFromSource(source: VerifiedProcessingSource): string {
  const locator = source.verifiedLocator;
  if (locator.kind !== "local") {
    throw new Error(
      `vfr-to-cfr demo only supports local upload sources (got ${locator.kind})`,
    );
  }
  return locator.path;
}

@Injectable()
export class VfrToCfrDomainRunner implements DomainRunner {
  readonly domainKind = VFR_TO_CFR_DOMAIN_KIND;

  async run(
    jobId: string,
    sources: Map<string, VerifiedProcessingSource>,
    io: DomainRunnerIo,
  ): Promise<DomainRunResult> {
    const video = sources.get(VFR_TO_CFR_SOURCE_IDS.video);
    if (!video) {
      throw new Error("Missing required upload source: video");
    }

    const inputPath = localPathFromSource(video);
    const outputPath = buildVfrToCfrOutputPath(jobId);
    await mkdir(getVfrToCfrOutputBaseDir(), { recursive: true });

    await io.onProgress({
      phase: "probing",
      detail: video.label ?? "video",
      percent: 0,
    });

    const durationSeconds = await probeMediaDurationSeconds(inputPath);

    await io.onProgress({
      phase: "converting",
      detail: `starting ffmpeg → ${VFR_TO_CFR_DEFAULT_FPS} fps CFR`,
      percent: 0,
    });

    await runFfmpegVfrToCfr({
      inputPath,
      outputPath,
      fps: VFR_TO_CFR_DEFAULT_FPS,
      durationSeconds,
      onProgress: async ({ percent, detail }) => {
        await io.onProgress({
          phase: "converting",
          detail,
          percent,
        });
      },
    });

    await io.onProgress({
      phase: "done",
      detail: outputPath,
      percent: 100,
    });

    return {
      outcome: "success",
      processedCount: 1,
      errorCount: 0,
    };
  }
}
