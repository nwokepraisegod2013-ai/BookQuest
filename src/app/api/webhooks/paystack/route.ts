import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { fulfillOrderByPaystackReference } from "@/lib/orders";
import { verifyPaystackWebhookSignature } from "@/lib/paystack";
import { OrderStatus } from "@prisma/client";
import { calculateMarketplaceSplit } from "@/lib/db";

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

  console.log("[WEBHOOK RECEIVED]", { time: new Date().toISOString() });

  /**
   * =========================
   * 1. VERIFY SIGNATURE
   * =========================
   */
  if (!verifyPaystackWebhookSignature(body, signature)) {
    console.log("[WEBHOOK REJECTED] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
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
   * 2. IDEMPOTENCY (EVENT DEDUPE)
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
  if (event.event !== "charge.success" || event.data.status !== "success") {
    console.log("[WEBHOOK IGNORED] Non-success event");
    return NextResponse.json({ received: true });
  }

  /**
   * =========================
   * 4. FETCH ORDER
   * =========================
   */
  const order = await db.order.findUnique({
    where: { paystackReference: reference },
    include: {
      items: {
        include: {
          book: true,
        },
      },
    },
  });

  if (!order) {
    console.log("[WEBHOOK ERROR] Order not found", { reference });
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  /**
   * =========================
   * 5. AMOUNT VALIDATION (SECURITY)
   * =========================
   */
  const expectedAmount = order.totalCents;
  const receivedAmount = event.data.amount;

  if (Math.abs(expectedAmount - receivedAmount) > 1) {
    console.error("[WEBHOOK AMOUNT MISMATCH]", {
      expectedAmount,
      receivedAmount,
      reference,
    });

    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  /**
   * =========================
   * 6. IDENTITY GUARD
   * =========================
   */
  if (order.status === OrderStatus.PAID) {
    console.log("[WEBHOOK SKIP] Already processed", {
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
    data: { status: OrderStatus.PAID },
  });

  console.log("[ORDER MARKED PAID]", { orderId: order.id });

  /**
   * =========================
   * 8. 💰 EARNINGS CALCULATION LAYER (NEW)
   * =========================
   *
   * This is the CORE marketplace financial logic
   */
  try {
    const platformFeePercent = 10;

    for (const item of order.items) {
      const split = calculateMarketplaceSplit({
        grossCents: item.priceCents,
        platformFeePercent,
      });

      console.log("[EARNINGS CALCULATED]", {
        orderId: order.id,
        bookId: item.bookId,
        sellerId: item.sellerId,
        gross: split.grossCents,
        platformFee: split.platformFeeCents,
        sellerEarnings: split.sellerEarningsCents,
      });

      /**
       * OPTIONAL PERSISTENCE HOOK (ENABLE WHEN LEDGER TABLE EXISTS)
       *
       * await db.earningLedger.create({
       *   data: {
       *     orderId: order.id,
       *     sellerId: item.sellerId,
       *     grossCents: split.grossCents,
       *     feeCents: split.platformFeeCents,
       *     netCents: split.sellerEarningsCents,
       *   }
       * });
       */
    }
  } catch (err) {
    console.error("[EARNINGS ERROR]", err);
  }

  /**
   * =========================
   * 9. FULFILL ORDER
   * =========================
   */
  try {
    await fulfillOrderByPaystackReference(reference);

    console.log("[ORDER FULFILLED]", {
      orderId: order.id,
      reference,
    });
  } catch (err) {
    console.error("[FULFILLMENT FAILED]", {
      orderId: order.id,
      error: err,
    });
  }

  return NextResponse.json({ received: true });
}
