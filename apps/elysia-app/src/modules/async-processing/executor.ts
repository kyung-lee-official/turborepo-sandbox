import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { domainRegistry } from "./domain-registry.ts";
import {
  claimProcessingPhase,
  findJobById,
  getManifestByManifestId,
  markComplete,
  markFailed,
} from "./processing-job.repository.ts";
import { progressPublisher } from "./progress-publisher.ts";
import type { SourceLocator, VerifiedProcessingSource } from "./types.ts";

async function verifyLocator(
  locator: SourceLocator,
): Promise<VerifiedProcessingSource["verifiedLocator"]> {
  if (locator.kind === "local") {
    const fileStat = await stat(locator.path);
    if (!fileStat.isFile()) {
      throw new Error(`Local path is not a file: ${locator.path}`);
    }
    return { ...locator, sizeBytes: fileStat.size };
  }
  throw new Error(
    `Only local sources supported in Elysia port (got ${locator.kind})`,
  );
}

async function openReadStream(
  locator: VerifiedProcessingSource["verifiedLocator"],
): Promise<NodeJS.ReadableStream> {
  if (locator.kind === "local") {
    return createReadStream(locator.path) as unknown as NodeJS.ReadableStream;
  }
  throw new Error(
    `Only local sources supported in Elysia port (got ${locator.kind})`,
  );
}

export async function runJob(
  jobId: string,
  domainKind: string,
  manifestId: string,
): Promise<void> {
  try {
    const existing = await findJobById(jobId);
    if (!existing) {
      console.warn(`Job ${jobId} not found before run`);
      return;
    }
    if (existing.phase === "complete" || existing.phase === "failed") {
      console.log(`Job ${jobId} already terminal: ${existing.phase}`);
      return;
    }

    const claimed = await claimProcessingPhase(jobId);
    if (!claimed) {
      console.log(`Job ${jobId} not claimed (already taken)`);
      return;
    }

    const registration = domainRegistry.getByDomainKind(domainKind);
    const manifest = await getManifestByManifestId(manifestId);
    if (!manifest) {
      await markFailed(jobId);
      progressPublisher.publishTerminal(jobId, "failed");
      return;
    }

    const verifiedSources = new Map<string, VerifiedProcessingSource>();
    for (const [sourceId, source] of Object.entries(manifest.sources)) {
      const verifiedLocator = await verifyLocator(source.locator);
      verifiedSources.set(sourceId, {
        ...source,
        sourceId: source.sourceId ?? sourceId,
        verifiedLocator,
      });
    }

    progressPublisher.publishProgress(jobId, {
      phase: "processing",
      detail: "starting",
    });

    const result = await registration.domainRunner.run(jobId, verifiedSources, {
      openStream: (source) => openReadStream(source.verifiedLocator),
      onProgress: async (detail) => {
        progressPublisher.publishProgress(jobId, detail);
      },
      context: manifest.context,
    });

    if (result.outcome === "validation_failed") {
      const prismaModule = await import("../../shared/db.ts");
      const prisma = prismaModule.getPrisma();
      await prisma.processingJobError.createMany({
        data: result.errors.map((error, index) => ({
          processingJobId: jobId,
          sequence: index + 1,
          payload: error as never,
        })),
      });
    }

    await markComplete(jobId, {
      outcome: result.outcome,
      processedCount: result.processedCount,
      errorCount: result.errorCount,
    });
    progressPublisher.publishTerminal(jobId, "complete");
  } catch (error) {
    console.error(`Job ${jobId} execution failed:`, error);
    try {
      await markFailed(jobId);
      progressPublisher.publishTerminal(jobId, "failed");
    } catch (innerError) {
      console.error(`Failed to mark job ${jobId} as failed:`, innerError);
    }
  }
}

export function scheduleJobExecution(
  jobId: string,
  domainKind: string,
  manifestId: string,
): void {
  setImmediate(() => {
    void runJob(jobId, domainKind, manifestId);
  });
}
