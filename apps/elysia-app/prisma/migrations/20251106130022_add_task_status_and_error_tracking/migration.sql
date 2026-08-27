/*
  Warnings:

  - Added the required column `updatedAt` to the `UploadLargeXlsxTask` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UploadLargeXlsxTaskStatus" AS ENUM ('PENDING', 'VALIDATING', 'SAVING', 'COMPLETED', 'HAS_ERRORS', 'FAILED');

-- AlterTable
ALTER TABLE "UploadLargeXlsxTask" ADD COLUMN     "errorRows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "savedRows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "savingProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "status" "UploadLargeXlsxTaskStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "totalRows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "validatedRows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "validationProgress" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UploadLargeXlsxError" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "errors" TEXT[],
    "rowData" JSONB NOT NULL,

    CONSTRAINT "UploadLargeXlsxError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UploadLargeXlsxError_taskId_idx" ON "UploadLargeXlsxError"("taskId");

-- AddForeignKey
ALTER TABLE "UploadLargeXlsxError" ADD CONSTRAINT "UploadLargeXlsxError_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "UploadLargeXlsxTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
