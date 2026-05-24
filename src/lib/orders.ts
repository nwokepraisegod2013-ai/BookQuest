import { OrderStatus } from "@prisma/client";
import { db } from "./db";
import { getEffectivePriceCents } from "./utils";

export async function fulfillOrder(orderId: string) {
  const existing = await db.order.findUnique({ where: { id: orderId } });
  if (existing?.status === OrderStatus.PAID) return existing;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: true },
  });

  if (!order) throw new Error("Order not found");

  const settings = await db.platformSettings.findUnique({
    where: { id: "default" },
  });
  const commissionPct = settings?.platformCommissionPct ?? 15;

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PAID },
    });

    for (const item of order.items) {
      const book = await tx.book.findUniqueOrThrow({
        where: { id: item.bookId },
        include: { seller: true },
      });

      const price = getEffectivePriceCents(book);
      const platformFee = Math.round((price * commissionPct) / 100);
      const sellerEarnings = price - platformFee;

      await tx.orderItem.update({
        where: { id: item.id },
        data: { platformFeeCents: platformFee, sellerEarningsCents: sellerEarnings },
      });

      await tx.libraryEntry.upsert({
        where: {
          userId_bookId: { userId: order.userId, bookId: item.bookId },
        },
        create: {
          userId: order.userId,
          bookId: item.bookId,
          orderId: order.id,
        },
        update: {},
      });

      await tx.book.update({
        where: { id: item.bookId },
        data: { salesCount: { increment: 1 } },
      });
    }

    await tx.cartItem.deleteMany({ where: { userId: order.userId } });
  });

  return db.order.findUnique({
    where: { id: order.id },
    include: { items: { include: { book: true } } },
  });
}

/** @deprecated Stripe — use fulfillOrder */
export async function fulfillOrderFromSession(sessionId: string) {
  const order = await db.order.findUnique({
    where: { stripeSessionId: sessionId },
  });
  if (!order) throw new Error("Order not found");
  return fulfillOrder(order.id);
}

export async function fulfillOrderByPaystackReference(reference: string) {
  const order = await db.order.findUnique({
    where: { paystackReference: reference },
  });
  if (!order) throw new Error("Order not found");
  return fulfillOrder(order.id);
}
