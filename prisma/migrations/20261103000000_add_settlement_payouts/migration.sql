ALTER TABLE "SellerProfile"
  ADD COLUMN IF NOT EXISTS "bankName" TEXT,
  ADD COLUMN IF NOT EXISTS "bankCode" TEXT,
  ADD COLUMN IF NOT EXISTS "accountName" TEXT,
  ADD COLUMN IF NOT EXISTS "accountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "transferRecipientCode" TEXT;

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "payoutId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

ALTER TABLE "Payout"
  ADD COLUMN IF NOT EXISTS "transferCode" TEXT,
  ADD COLUMN IF NOT EXISTS "failureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_payoutId_fkey') THEN
    ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_payoutId_fkey"
      FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "OrderItem_sellerId_payoutId_idx" ON "OrderItem"("sellerId", "payoutId");
CREATE INDEX IF NOT EXISTS "Payout_sellerId_status_idx" ON "Payout"("sellerId", "status");
