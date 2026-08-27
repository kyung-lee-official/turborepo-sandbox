-- CreateTable
CREATE TABLE "UploadLargeXlsxTask" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadLargeXlsxTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadLargeXlsxData" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "bioId" TEXT NOT NULL,

    CONSTRAINT "UploadLargeXlsxData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UploadLargeXlsxData_taskId_idx" ON "UploadLargeXlsxData"("taskId");

-- AddForeignKey
ALTER TABLE "UploadLargeXlsxData" ADD CONSTRAINT "UploadLargeXlsxData_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "UploadLargeXlsxTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
