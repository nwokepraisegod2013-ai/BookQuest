import { PayoutStatus } from "@prisma/client";
import { db } from "@/lib/db";

export const SETTLEMENT_HOLD_WORKING_DAYS = 7;

export function settlementCutoff(now = new Date()) {
  const cutoff = new Date(now);
  let remaining = SETTLEMENT_HOLD_WORKING_DAYS;
  while (remaining > 0) {
    cutoff.setUTCDate(cutoff.getUTCDate() - 1);
    const day = cutoff.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return cutoff;
}

export async function getSellerSettlementSummary(sellerId: string) {
  const cutoff = settlementCutoff();
  const [available, onHold, paid] = await Promise.all([
    db.orderItem.aggregate({ where: { sellerId, payoutId: null, order: { status: "PAID", OR: [{ paidAt: { lte: cutoff } }, { paidAt: null, createdAt: { lte: cutoff } }] } }, _sum: { sellerEarningsCents: true } }),
    db.orderItem.aggregate({ where: { sellerId, payoutId: null, order: { status: "PAID", OR: [{ paidAt: { gt: cutoff } }, { paidAt: null, createdAt: { gt: cutoff } }] } }, _sum: { sellerEarningsCents: true } }),
    db.payout.aggregate({ where: { sellerId, status: PayoutStatus.PAID }, _sum: { amountCents: true } }),
  ]);
  return { availableCents: available._sum.sellerEarningsCents ?? 0, onHoldCents: onHold._sum.sellerEarningsCents ?? 0, paidCents: paid._sum.amountCents ?? 0, cutoff };
}
