import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { fulfillOrderByPaystackReference } from "@/lib/orders";
import { verifyPaystackWebhookSignature } from "@/lib/paystack";

type PaystackWebhookBody = {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    metadata?: { orderId?: string };
  };
};

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("x-paystack-signature");

  if (!verifyPaystackWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body) as PaystackWebhookBody;
  const eventId = `${event.event}:${event.data.reference}`;

  const existing = await db.paystackEvent.findUnique({ where: { id: eventId } });
  if (existing) return NextResponse.json({ received: true });

  await db.paystackEvent.create({
    data: { id: eventId, type: event.event },
  });

  if (event.event === "charge.success" && event.data.status === "success") {
    const order = await db.order.findUnique({
      where: { paystackReference: event.data.reference },
    });
    if (order && event.data.amount === order.totalCents) {
      await fulfillOrderByPaystackReference(event.data.reference);
    }
  }

  return NextResponse.json({ received: true });
}
