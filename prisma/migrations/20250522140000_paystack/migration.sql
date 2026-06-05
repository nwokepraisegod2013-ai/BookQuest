-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paystackReference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_paystackReference_key" ON "Order"("paystackReference");

-- CreateTable
CREATE TABLE "PaystackEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaystackEvent_pkey" PRIMARY KEY ("id")
);
