/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `TestConnectOrCreateProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TestConnectOrCreateProduct_name_key" ON "TestConnectOrCreateProduct"("name");
