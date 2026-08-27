-- CreateEnum
CREATE TYPE "ProcessingPhase" AS ENUM ('queued', 'processing', 'complete', 'failed');

-- CreateEnum
CREATE TYPE "ProcessingOutcome" AS ENUM ('success', 'validation_failed', 'failed');

-- CreateTable
CREATE TABLE "ProcessingJob" (
    "id" TEXT NOT NULL,
    "domainKind" TEXT NOT NULL,
    "phase" "ProcessingPhase" NOT NULL DEFAULT 'queued',
    "outcome" "ProcessingOutcome",
    "processedCount" INTEGER,
    "errorCount" INTEGER,
    "errorStorageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingManifest" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "domainKind" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessingManifest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessingJob_domainKind_idx" ON "ProcessingJob"("domainKind");

-- CreateIndex
CREATE INDEX "ProcessingJob_phase_idx" ON "ProcessingJob"("phase");

-- CreateIndex
CREATE INDEX "ProcessingJob_domainKind_phase_idx" ON "ProcessingJob"("domainKind", "phase");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingManifest_jobId_key" ON "ProcessingManifest"("jobId");

-- CreateIndex
CREATE INDEX "ProcessingManifest_domainKind_idx" ON "ProcessingManifest"("domainKind");

-- AddForeignKey
ALTER TABLE "ProcessingManifest" ADD CONSTRAINT "ProcessingManifest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
