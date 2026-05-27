import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { fulfillOrderByPaystackReference } from "@/lib/orders";
import { verifyPaystackWebhookSignature } from "@/lib/paystack";
import { OrderStatus } from "@prisma/client";

type PaystackWebhookBody = {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number; // Paystack sends in kobo
    metadata?: {
      orderId?: string;
    };
  };
};

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("x-paystack-signature");

  /**
   * =========================
   * 1. VERIFY SIGNATURE
   * =========================
   */
  if (!verifyPaystackWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body) as PaystackWebhookBody;

  const reference = event.data.reference;

  /**
   * =========================
   * 2. IDEMPOTENCY CHECK
   * =========================
   */
  const eventId = `${event.event}:${reference}`;

  const existingEvent = await db.paystackEvent.findUnique({
    where: { id: eventId },
  });

  if (existingEvent) {
    return NextResponse.json({ received: true });
  }

  await db.paystackEvent.create({
    data: {
      id: eventId,
      type: event.event,
    },
  });

  /**
   * =========================
   * 3. ONLY HANDLE SUCCESS EVENTS
   * =========================
   */
  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  if (event.data.status !== "success") {
    return NextResponse.json({ received: true });
  }

  /**
   * =========================
   * 4. FIND ORDER
   * =========================
   */
  const order = await db.order.findUnique({
    where: { paystackReference: reference },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  /**
   * =========================
   * 5. SAFE AMOUNT VALIDATION
   * =========================
   * Allow small tolerance for rounding issues
   */
  const expectedAmount = order.totalCents;
  const receivedAmount = event.data.amount;

  const isValidAmount = Math.abs(expectedAmount - receivedAmount) <= 1;

  if (!isValidAmount) {
    console.error("Amount mismatch:", {
      expectedAmount,
      receivedAmount,
      reference,
    });

    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  /**
   * =========================
   * 6. UPDATE ORDER STATUS FIRST
   * =========================
   */
  await db.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.PAID,
    },
  });

  /**
   * =========================
   * 7. FULFILL ORDER
   * =========================
   */
  await fulfillOrderByPaystackReference(reference);

  return NextResponse.json({ received: true });
}
