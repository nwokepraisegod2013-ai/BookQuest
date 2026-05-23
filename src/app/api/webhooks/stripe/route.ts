import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { fulfillOrderFromSession } from "@/lib/orders";
import { OrderStatus } from "@prisma/client";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const existing = await db.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing) return NextResponse.json({ received: true });

  await db.stripeEvent.create({
    data: { id: event.id, type: event.type },
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.id) {
      await db.order.updateMany({
        where: { stripeSessionId: session.id },
        data: {
          stripePaymentId: session.payment_intent as string | undefined,
        },
      });
      await fulfillOrderFromSession(session.id);
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    await db.order.updateMany({
      where: { stripeSessionId: session.id },
      data: { status: OrderStatus.FAILED },
    });
  }

  return NextResponse.json({ received: true });
}
