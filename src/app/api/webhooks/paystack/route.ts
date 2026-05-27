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

  /**
   * =========================
   * 5. AMOUNT VALIDATION
   * =========================
   */
  const receivedAmount = event.data.amount;

  if (Math.abs(order.totalCents - receivedAmount) > 1) {
    return NextResponse.json(
      { error: "Amount mismatch" },
      { status: 400 }
    );
  }

  /**
   * =========================
   * 6. IDENTITY GUARD
   * =========================
   */
  if (order.status === OrderStatus.PAID) {
    return NextResponse.json({ received: true });
  }

  /**
   * =========================
   * 7. MARK ORDER AS PAID
   * =========================
   */
  await db.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.PAID },
  });

  console.log("[ORDER PAID]", { orderId: order.id });

  /**
   * =========================
   * 8. EARNINGS ENGINE (PRODUCTION SAFE)
   * =========================
   *
   * IMPORTANT:
   * We compute from ORDER TOTAL, NOT item price,
   * to avoid drift or manipulation.
   */
  try {
    const PLATFORM_FEE_PERCENT = 10;

    const gross = order.totalCents;
    const platformFee = Math.floor(
      (gross * PLATFORM_FEE_PERCENT) / 100
    );
    const sellerNet = gross - platformFee;

    /**
     * Group earnings per seller
     */
    const sellerMap = new Map<string, number>();

    for (const item of order.items) {
      const current = sellerMap.get(item.sellerId) ?? 0;
      sellerMap.set(item.sellerId, current + item.priceCents);
    }

    for (const [sellerId, sellerGross] of sellerMap.entries()) {
      const split = calculateMarketplaceSplit({
        grossCents: sellerGross,
        platformFeePercent: PLATFORM_FEE_PERCENT,
      });

      console.log("[EARNINGS]", {
        orderId: order.id,
        sellerId,
        gross: split.grossCents,
        platformFee: split.platformFeeCents,
        sellerEarnings: split.sellerEarningsCents,
      });

      /**
       * OPTIONAL LEDGER (RECOMMENDED)
       */
      // await db.earningLedger.create({
      //   data: {
      //     orderId: order.id,
      //     sellerId,
      //     grossCents: split.grossCents,
      //     feeCents: split.platformFeeCents,
      //     netCents: split.sellerEarningsCents,
      //   },
      // });
    }
  } catch (err) {
    console.error("[EARNINGS ERROR]", err);
  }

  /**
   * =========================
   * 9. FULFILLMENT
   * =========================
   */
  try {
    await fulfillOrderByPaystackReference(reference);

    console.log("[ORDER FULFILLED]", {
      orderId: order.id,
    });
  } catch (err) {
    console.error("[FULFILLMENT FAILED]", err);
  }

  return NextResponse.json({ received: true });
}
