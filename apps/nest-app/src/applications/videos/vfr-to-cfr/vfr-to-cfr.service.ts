import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { Injectable, NotFoundException, StreamableFile } from "@nestjs/common";
import { PrismaService } from "@/recipes/prisma/prisma.service";
import {
  buildVfrToCfrDownloadFileName,
  buildVfrToCfrOutputPath,
  getVfrToCfrOutputBaseDir,
} from "./helpers/job-output-paths";
import {
  resolveVfrToCfrMaxUploadBytes,
  VFR_TO_CFR_DOMAIN_KIND,
  VFR_TO_CFR_UPLOAD_MAX_BYTES_ENV,
} from "./vfr-to-cfr.constants";

@Injectable()
export class VfrToCfrService {
  constructor(private readonly prisma: PrismaService) {}

  getTemplateInfo() {
    const maxUploadBytes = resolveVfrToCfrMaxUploadBytes();
    return {
      module: "vfr-to-cfr",
      domainKind: VFR_TO_CFR_DOMAIN_KIND,
      outputBaseDir: getVfrToCfrOutputBaseDir(),
      maxUploadBytes,
      maxUploadBytesEnv: VFR_TO_CFR_UPLOAD_MAX_BYTES_ENV,
      endpoints: [
        "POST /vfr-to-cfr/upload",
        "POST /vfr-to-cfr/start",
        "GET /jobs/:jobId",
        "GET /jobs/:jobId/events",
        "GET /vfr-to-cfr/jobs/:jobId/download",
      ],
    };
  }

  async downloadResult(jobId: string): Promise<StreamableFile> {
    const job = await this.prisma.client.processingJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.domainKind !== VFR_TO_CFR_DOMAIN_KIND) {
      throw new NotFoundException(`vfr-to-cfr job not found: ${jobId}`);
    }

    if (job.phase !== "complete" || job.outcome !== "success") {
      throw new NotFoundException(
        `Converted file is not ready for job ${jobId} (phase=${job.phase}, outcome=${job.outcome})`,
      );
    }

    const outputPath = buildVfrToCfrOutputPath(jobId);
    try {
      await access(outputPath);
    } catch {
      throw new NotFoundException(`Output file missing for job ${jobId}`);
    }

    const fileStat = await stat(outputPath);
    const stream = createReadStream(outputPath);
    const fileName = buildVfrToCfrDownloadFileName(jobId);

    return new StreamableFile(stream, {
      type: "video/mp4",
      disposition: `attachment; filename="${fileName}"`,
      length: fileStat.size,
    });
  }
}
