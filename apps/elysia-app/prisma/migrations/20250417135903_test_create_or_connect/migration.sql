-- CreateTable
CREATE TABLE "RetailSalesData" (
    "id" BIGSERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "receiptTypeId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "skuId" INTEGER NOT NULL,
    "nameZhCn" TEXT NOT NULL,
    "salesVolume" DOUBLE PRECISION NOT NULL,
    "platformAddressId" INTEGER,
    "platformOrderId" TEXT NOT NULL,
    "storehouseId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "taxInclusivePriceCny" DOUBLE PRECISION,
    "priceCny" DOUBLE PRECISION,
    "unitPriceCny" DOUBLE PRECISION,

    CONSTRAINT "RetailSalesData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailSalesDataBatch" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailSalesDataBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailSalesDataReceiptType" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "RetailSalesDataReceiptType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailSalesDataClient" (
    "id" SERIAL NOT NULL,
    "client" TEXT NOT NULL,

    CONSTRAINT "RetailSalesDataClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailSalesDataDepartment" (
    "id" SERIAL NOT NULL,
    "department" TEXT NOT NULL,

    CONSTRAINT "RetailSalesDataDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailSalesDataSku" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,

    CONSTRAINT "RetailSalesDataSku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailSalesDataPlatformAddress" (
    "id" SERIAL NOT NULL,
    "platformAddress" TEXT NOT NULL,

    CONSTRAINT "RetailSalesDataPlatformAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailSalesDataStorehouse" (
    "id" SERIAL NOT NULL,
    "storehouse" TEXT NOT NULL,

    CONSTRAINT "RetailSalesDataStorehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailSalesDataCategory" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "RetailSalesDataCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetailSalesData_clientId_idx" ON "RetailSalesData"("clientId");

-- CreateIndex
CREATE INDEX "RetailSalesData_departmentId_idx" ON "RetailSalesData"("departmentId");

-- CreateIndex
CREATE INDEX "RetailSalesData_skuId_nameZhCn_idx" ON "RetailSalesData"("skuId", "nameZhCn");

-- CreateIndex
CREATE INDEX "RetailSalesData_salesVolume_idx" ON "RetailSalesData"("salesVolume");

-- CreateIndex
CREATE INDEX "RetailSalesData_platformAddressId_idx" ON "RetailSalesData"("platformAddressId");

-- CreateIndex
CREATE INDEX "RetailSalesData_platformOrderId_idx" ON "RetailSalesData"("platformOrderId");

-- CreateIndex
CREATE INDEX "RetailSalesData_storehouseId_idx" ON "RetailSalesData"("storehouseId");

-- CreateIndex
CREATE INDEX "RetailSalesData_categoryId_idx" ON "RetailSalesData"("categoryId");

-- CreateIndex
CREATE INDEX "RetailSalesData_taxInclusivePriceCny_idx" ON "RetailSalesData"("taxInclusivePriceCny");

-- CreateIndex
CREATE INDEX "RetailSalesData_priceCny_idx" ON "RetailSalesData"("priceCny");

-- CreateIndex
CREATE INDEX "RetailSalesData_unitPriceCny_idx" ON "RetailSalesData"("unitPriceCny");

-- CreateIndex
CREATE INDEX "RetailSalesData_batchId_idx" ON "RetailSalesData"("batchId");

-- CreateIndex
CREATE INDEX "RetailSalesData_date_idx" ON "RetailSalesData"("date");

-- CreateIndex
CREATE INDEX "RetailSalesData_receiptTypeId_idx" ON "RetailSalesData"("receiptTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "RetailSalesDataReceiptType_type_key" ON "RetailSalesDataReceiptType"("type");

-- CreateIndex
CREATE UNIQUE INDEX "RetailSalesDataClient_client_key" ON "RetailSalesDataClient"("client");

-- CreateIndex
CREATE UNIQUE INDEX "RetailSalesDataDepartment_department_key" ON "RetailSalesDataDepartment"("department");

-- CreateIndex
CREATE UNIQUE INDEX "RetailSalesDataSku_sku_key" ON "RetailSalesDataSku"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "RetailSalesDataPlatformAddress_platformAddress_key" ON "RetailSalesDataPlatformAddress"("platformAddress");

-- CreateIndex
CREATE UNIQUE INDEX "RetailSalesDataStorehouse_storehouse_key" ON "RetailSalesDataStorehouse"("storehouse");

-- CreateIndex
CREATE UNIQUE INDEX "RetailSalesDataCategory_category_key" ON "RetailSalesDataCategory"("category");

-- AddForeignKey
ALTER TABLE "RetailSalesData" ADD CONSTRAINT "RetailSalesData_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RetailSalesDataBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailSalesData" ADD CONSTRAINT "RetailSalesData_receiptTypeId_fkey" FOREIGN KEY ("receiptTypeId") REFERENCES "RetailSalesDataReceiptType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailSalesData" ADD CONSTRAINT "RetailSalesData_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "RetailSalesDataClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailSalesData" ADD CONSTRAINT "RetailSalesData_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "RetailSalesDataDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailSalesData" ADD CONSTRAINT "RetailSalesData_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "RetailSalesDataSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailSalesData" ADD CONSTRAINT "RetailSalesData_platformAddressId_fkey" FOREIGN KEY ("platformAddressId") REFERENCES "RetailSalesDataPlatformAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailSalesData" ADD CONSTRAINT "RetailSalesData_storehouseId_fkey" FOREIGN KEY ("storehouseId") REFERENCES "RetailSalesDataStorehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailSalesData" ADD CONSTRAINT "RetailSalesData_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RetailSalesDataCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
