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
    amount: number; // kobo
    metadata?: {
      orderId?: string;
    };
  };
};

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("x-paystack-signature");

  console.log("[WEBHOOK RECEIVED]", {
    time: new Date().toISOString(),
  });

  /**
   * =========================
   * 1. SIGNATURE VERIFY
   * =========================
   */
  if (!verifyPaystackWebhookSignature(body, signature)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const event = JSON.parse(body) as PaystackWebhookBody;
  const reference = event.data.reference;

  /**
   * =========================
   * 2. IDEMPOTENCY LOCK
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
   * 3. FILTER ONLY SUCCESS
   * =========================
   */
  if (event.event !== "charge.success" || event.data.status !== "success") {
    return NextResponse.json({ received: true });
  }

  /**
   * =========================
   * 4. FETCH ORDER (SOURCE OF TRUTH)
   * =========================
   */
  const order = await db.order.findUnique({
    where: { paystackReference: reference },
    include: {
      items: true,
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  const subtotalCents = order.items.reduce(
    (sum, item) => sum + item.priceCents,
    0
  );
  const expectedPlatformFee = Math.floor((subtotalCents * 10) / 100);
  const expectedTotal = subtotalCents + expectedPlatformFee;

  const receivedAmount = event.data.amount;

  if (Math.abs(expectedTotal - receivedAmount) > 1) {
    return NextResponse.json(
      { error: "Amount mismatch" },
      { status: 400 }
    );
  }

  if (order.status === OrderStatus.PAID) {
    return NextResponse.json({ received: true });
  }

  try {
    await fulfillOrderByPaystackReference(reference);
    console.log("[ORDER FULFILLED]", { orderId: order.id });
  } catch (err) {
    console.error("[FULFILLMENT FAILED]", err);
  }

  return NextResponse.json({ received: true });
}
