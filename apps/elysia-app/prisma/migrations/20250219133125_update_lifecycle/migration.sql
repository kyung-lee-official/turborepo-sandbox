/*
  Warnings:

  - You are about to drop the column `elapsedTime` on the `Lifecycle` table. All the data in the column will be lost.
  - You are about to drop the column `hasInstance` on the `Lifecycle` table. All the data in the column will be lost.
  - Added the required column `value` to the `Lifecycle` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lifecycle" DROP COLUMN "elapsedTime",
DROP COLUMN "hasInstance",
ADD COLUMN     "value" INTEGER NOT NULL;
