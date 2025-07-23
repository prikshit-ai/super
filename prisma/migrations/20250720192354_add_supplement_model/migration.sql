-- CreateTable
CREATE TABLE "Supplement" (
    "id" SERIAL NOT NULL,
    "productUrl" TEXT NOT NULL,
    "productImageUrl" TEXT,
    "nutritionData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplement_productUrl_key" ON "Supplement"("productUrl");
