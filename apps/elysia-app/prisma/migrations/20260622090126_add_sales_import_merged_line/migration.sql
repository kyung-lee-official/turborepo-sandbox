-- CreateTable
CREATE TABLE "SalesImportMergedLine" (
    "id" SERIAL NOT NULL,
    "processingJobId" TEXT NOT NULL,
    "sourceLineNumber" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "saleDate" DATE NOT NULL,
    "productName" TEXT,
    "category" TEXT,
    "unitPrice" DECIMAL(10,2),
    "inventoryQty" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesImportMergedLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesImportMergedLine_processingJobId_idx" ON "SalesImportMergedLine"("processingJobId");

-- CreateIndex
CREATE INDEX "SalesImportMergedLine_sku_idx" ON "SalesImportMergedLine"("sku");

-- CreateIndex
CREATE INDEX "SalesImportMergedLine_orderId_idx" ON "SalesImportMergedLine"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesImportMergedLine_processingJobId_sourceLineNumber_key" ON "SalesImportMergedLine"("processingJobId", "sourceLineNumber");

-- AddForeignKey
ALTER TABLE "SalesImportMergedLine" ADD CONSTRAINT "SalesImportMergedLine_processingJobId_fkey" FOREIGN KEY ("processingJobId") REFERENCES "ProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
