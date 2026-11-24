ALTER TABLE "SellerProfile"
  ADD COLUMN "bankName" TEXT,
  ADD COLUMN "bankCode" TEXT,
  ADD COLUMN "accountName" TEXT,
  ADD COLUMN "accountNumber" TEXT,
  ADD COLUMN "transferRecipientCode" TEXT;

ALTER TABLE "OrderItem" ADD COLUMN "payoutId" TEXT;
ALTER TABLE "Order" ADD COLUMN "paidAt" TIMESTAMP(3);

ALTER TABLE "Payout"
  ADD COLUMN "transferCode" TEXT,
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "processedAt" TIMESTAMP(3);

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_payoutId_fkey"
  FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "OrderItem_sellerId_payoutId_idx" ON "OrderItem"("sellerId", "payoutId");
CREATE INDEX "Payout_sellerId_status_idx" ON "Payout"("sellerId", "status");
