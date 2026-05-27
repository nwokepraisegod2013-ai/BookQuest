import { db } from "@/lib/db";
import { OrderStatus } from "@prisma/client";

/**
 * =========================
 * IDEMPOTENCY EVENT STORE
 * =========================
 */
export async function storePaystackEvent(eventId: string, type: string) {
  const existing = await db.paystackEvent.findUnique({
    where: { id: eventId },
  });

  if (existing) return false;

  await db.paystackEvent.create({
    data: {
      id: eventId,
      type,
    },
  });

  return true;
}

/**
 * =========================
 * SAFE ORDER FULFILLMENT GATE
 * =========================
 */
export async function markOrderPaid(orderId: string) {
  return db.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.PAID,
    },
  });
}

/**
 * =========================
 * DUPLICATE GUARD
 * =========================
 */
export function isValidPaystackAmount(
  expectedCents: number,
  receivedCents: number
) {
  return Math.abs(expectedCents - receivedCents) <= 1;
}