import { OrderStatus } from "@prisma/client";
import { db } from "./db";

export async function fulfillOrder(orderId: string) {
  const existing = await db.order.findUnique({ where: { id: orderId } });
  if (existing?.status === OrderStatus.PAID) return existing;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw new Error("Order not found");

  const subtotalCents = order.items.reduce(
    (sum, item) => sum + item.priceCents,
    0
  );
  const platformFeeCents = Math.floor((subtotalCents * 10) / 100);

  const feeAllocation = order.items.map((item, index) => {
    const allocated = Math.floor(
      (item.priceCents * platformFeeCents) / subtotalCents
    );

    return {
      id: item.id,
      platformFeeCents: allocated,
      sellerEarningsCents: item.priceCents,
      isLast: index === order.items.length - 1,
    };
  });

  if (feeAllocation.length) {
    const allocatedTotal = feeAllocation
      .slice(0, -1)
      .reduce((sum, record) => sum + record.platformFeeCents, 0);
    feeAllocation[feeAllocation.length - 1].platformFeeCents =
      platformFeeCents - allocatedTotal;
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PAID },
    });

    for (const item of feeAllocation) {
      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          platformFeeCents: item.platformFeeCents,
          sellerEarningsCents: item.sellerEarningsCents,
        },
      });
    }

    for (const item of order.items) {
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
