-- CreateTable
CREATE TABLE "ProcessingJobError" (
    "id" TEXT NOT NULL,
    "processingJobId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "ProcessingJobError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessingJobError_processingJobId_idx" ON "ProcessingJobError"("processingJobId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingJobError_processingJobId_sequence_key" ON "ProcessingJobError"("processingJobId", "sequence");

-- AddForeignKey
ALTER TABLE "ProcessingJobError" ADD CONSTRAINT "ProcessingJobError_processingJobId_fkey" FOREIGN KEY ("processingJobId") REFERENCES "ProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
