-- DropIndex
DROP INDEX "Role_id_key";

-- CreateTable
CREATE TABLE "Performance" (
    "id" SERIAL NOT NULL,
    "score" INTEGER NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Performance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
