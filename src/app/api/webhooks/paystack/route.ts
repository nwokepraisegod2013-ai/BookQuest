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
   * 1. VERIFY SIGNATURE
   * =========================
   */
  if (!verifyPaystackWebhookSignature(body, signature)) {
    console.log("[WEBHOOK REJECTED] Invalid signature");

    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const event = JSON.parse(body) as PaystackWebhookBody;
  const reference = event.data.reference;

  console.log("[WEBHOOK EVENT]", {
    event: event.event,
    reference,
    status: event.data.status,
    amount: event.data.amount,
  });

  /**
   * =========================
   * 2. IDEMPOTENCY CHECK (EVENT DEDUPE)
   * =========================
   */
  const eventId = `${event.event}:${reference}`;

  const existingEvent = await db.paystackEvent.findUnique({
    where: { id: eventId },
  });

  if (existingEvent) {
    console.log("[WEBHOOK SKIPPED] Duplicate event", { eventId });

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
   * 3. FILTER SUCCESS EVENTS ONLY
   * =========================
   */
  if (event.event !== "charge.success") {
    console.log("[WEBHOOK IGNORED] Non-success event", {
      event: event.event,
    });

    return NextResponse.json({ received: true });
  }

  if (event.data.status !== "success") {
    console.log("[WEBHOOK IGNORED] Failed payment status", {
      status: event.data.status,
    });

    return NextResponse.json({ received: true });
  }

  /**
   * =========================
   * 4. FETCH ORDER
   * =========================
   */
  const order = await db.order.findUnique({
    where: { paystackReference: reference },
    include: { items: true },
  });

  if (!order) {
    console.log("[WEBHOOK ERROR] Order not found", { reference });

    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  console.log("[ORDER FOUND]", {
    orderId: order.id,
    currentStatus: order.status,
  });

  /**
   * =========================
   * 5. AMOUNT VALIDATION (SECURITY CHECK)
   * =========================
   */
  const expectedAmount = order.totalCents;
  const receivedAmount = event.data.amount;

  const isValidAmount = Math.abs(expectedAmount - receivedAmount) <= 1;

  if (!isValidAmount) {
    console.error("[WEBHOOK AMOUNT MISMATCH]", {
      orderId: order.id,
      expectedAmount,
      receivedAmount,
      reference,
    });

    return NextResponse.json(
      { error: "Invalid amount" },
      { status: 400 }
    );
  }

  /**
   * =========================
   * 6. IDENTITY GUARD (PREVENT DOUBLE FULFILLMENT)
   * =========================
   */
  if (order.status === OrderStatus.PAID) {
    console.log("[WEBHOOK SKIP] Order already paid", {
      orderId: order.id,
    });

    return NextResponse.json({ received: true });
  }

  /**
   * =========================
   * 7. UPDATE ORDER STATUS
   * =========================
   */
  await db.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.PAID,
    },
  });

  console.log("[ORDER MARKED PAID]", {
    orderId: order.id,
  });

  /**
   * =========================
   * 8. FULFILL ORDER
   * =========================
   */
  try {
    await fulfillOrderByPaystackReference(reference);

    console.log("[ORDER FULFILLED SUCCESS]", {
      orderId: order.id,
      reference,
    });
  } catch (err) {
    console.error("[FULFILLMENT FAILED]", {
      orderId: order.id,
      error: err,
    });

    /**
     * IMPORTANT:
     * Do not fail webhook — Paystack will NOT retry reliably for business logic errors
     */
  }

  return NextResponse.json({ received: true });
}
