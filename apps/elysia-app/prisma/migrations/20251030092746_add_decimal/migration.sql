-- CreateTable
CREATE TABLE "TestDecimal" (
    "id" SERIAL NOT NULL,
    "decimal" DECIMAL(65,30) NOT NULL,
    "rate" DECIMAL(10,6) NOT NULL,
    "monetary" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "TestDecimal_pkey" PRIMARY KEY ("id")
);
