/*
  Warnings:

  - The values [VALIDATING,SAVING,LOADING_WORKBOOK,VALIDATING_HEADERS] on the enum `UploadLargeXlsxTaskStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `savingProgress` on the `UploadLargeXlsxTask` table. All the data in the column will be lost.
  - You are about to drop the column `validationProgress` on the `UploadLargeXlsxTask` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UploadLargeXlsxTaskStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'HAS_ERRORS', 'FAILED');
ALTER TABLE "public"."UploadLargeXlsxTask" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UploadLargeXlsxTask" ALTER COLUMN "status" TYPE "UploadLargeXlsxTaskStatus_new" USING ("status"::text::"UploadLargeXlsxTaskStatus_new");
ALTER TYPE "UploadLargeXlsxTaskStatus" RENAME TO "UploadLargeXlsxTaskStatus_old";
ALTER TYPE "UploadLargeXlsxTaskStatus_new" RENAME TO "UploadLargeXlsxTaskStatus";
DROP TYPE "public"."UploadLargeXlsxTaskStatus_old";
ALTER TABLE "UploadLargeXlsxTask" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "UploadLargeXlsxTask" DROP COLUMN "savingProgress",
DROP COLUMN "validationProgress";
