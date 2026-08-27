/*
  Warnings:

  - Added the required column `hasInstance` to the `Lifecycle` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lifecycle" ADD COLUMN     "hasInstance" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "_CategoryToPost" ADD CONSTRAINT "_CategoryToPost_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_CategoryToPost_AB_unique";

-- AlterTable
ALTER TABLE "_GroupToUser" ADD CONSTRAINT "_GroupToUser_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_GroupToUser_AB_unique";

-- AlterTable
ALTER TABLE "_MemberToRole" ADD CONSTRAINT "_MemberToRole_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_MemberToRole_AB_unique";
