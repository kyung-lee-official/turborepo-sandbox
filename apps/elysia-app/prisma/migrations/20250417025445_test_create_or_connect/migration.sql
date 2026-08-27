/*
  Warnings:

  - You are about to drop the `Lifecycle` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Lifecycle";

-- CreateTable
CREATE TABLE "TestConnectOrCreateOrder" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "TestConnectOrCreateOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestConnectOrCreateProduct" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TestConnectOrCreateProduct_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TestConnectOrCreateOrder" ADD CONSTRAINT "TestConnectOrCreateOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TestConnectOrCreateProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
