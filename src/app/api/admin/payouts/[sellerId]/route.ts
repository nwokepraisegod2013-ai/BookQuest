import { NextResponse } from "next/server";
import { PayoutStatus, Role } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { initiateTransfer } from "@/lib/paystack";
import { settlementCutoff } from "@/lib/settlements";

export async function POST(_req: Request, { params }: { params: Promise<{ sellerId: string }> }) {
  const admin = await getAuthUser();
  if (!admin || admin.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { sellerId } = await params;
  const seller = await db.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller?.transferRecipientCode) return NextResponse.json({ error: "Seller has not completed payout account setup" }, { status: 400 });

  const settings = await db.platformSettings.findUnique({ where: { id: "default" } });
  const cutoff = settlementCutoff();
  const eligible = await db.orderItem.findMany({ where: { sellerId, payoutId: null, order: { status: "PAID", OR: [{ paidAt: { lte: cutoff } }, { paidAt: null, createdAt: { lte: cutoff } }] } }, select: { id: true, sellerEarningsCents: true } });
  const amountCents = eligible.reduce((total, item) => total + item.sellerEarningsCents, 0);
  if (!amountCents) return NextResponse.json({ error: "No earnings are eligible for payout yet" }, { status: 400 });
  if (amountCents < (settings?.minPayoutCents ?? 500000)) return NextResponse.json({ error: "Eligible balance has not reached the minimum payout amount" }, { status: 400 });

  const payout = await db.$transaction(async (tx) => {
    const created = await tx.payout.create({ data: { sellerId, amountCents, status: PayoutStatus.PROCESSING, periodStart: new Date(0), periodEnd: cutoff } });
    const claimed = await tx.orderItem.updateMany({ where: { id: { in: eligible.map((item) => item.id) }, payoutId: null }, data: { payoutId: created.id } });
    if (claimed.count !== eligible.length) throw new Error("Eligible earnings changed. Refresh and try again.");
    return tx.payout.update({ where: { id: created.id }, data: { reference: `payout_${created.id}` } });
  });

  try {
    const transfer = await initiateTransfer({ amountCents, recipientCode: seller.transferRecipientCode, reference: payout.reference!, reason: `BookQuest seller settlement for ${seller.storeName}` });
    await db.payout.update({ where: { id: payout.id }, data: { transferCode: transfer.transfer_code } });
    return NextResponse.json({ ok: true, payoutId: payout.id, status: PayoutStatus.PROCESSING });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transfer initiation failed";
    await db.$transaction(async (tx) => {
      await tx.orderItem.updateMany({ where: { payoutId: payout.id }, data: { payoutId: null } });
      await tx.payout.update({ where: { id: payout.id }, data: { status: PayoutStatus.FAILED, failureReason: message, processedAt: new Date() } });
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
