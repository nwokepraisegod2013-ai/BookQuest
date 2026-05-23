import { NextResponse } from "next/server";
import { syncUserFromClerk } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { getStripe, CURRENCY } from "@/lib/stripe";
import { getEffectivePriceCents } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";

export async function POST() {
  const user = await syncUserFromClerk();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items, subtotalCents } = await getCart(user.id);
  if (items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const order = await db.order.create({
    data: {
      userId: user.id,
      status: OrderStatus.PENDING,
      totalCents: subtotalCents,
      currency: CURRENCY,
      items: {
        create: items.map((item) => ({
          bookId: item.book.id,
          sellerId: item.book.sellerId,
          priceCents: getEffectivePriceCents(item.book),
        })),
      },
    },
    include: { items: { include: { book: true } } },
  });

  const stripe = getStripe();

  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { clerkId: user.clerkId, userId: user.id },
    });
    stripeCustomerId = customer.id;
    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "payment",
    currency: CURRENCY,
    line_items: order.items.map((item) => ({
      quantity: 1,
      price_data: {
        currency: CURRENCY,
        unit_amount: item.priceCents,
        product_data: {
          name: item.book.title,
          images: item.book.coverUrl.startsWith("http") ? [item.book.coverUrl] : undefined,
          metadata: {
            bookId: item.book.id,
            orderId: order.id,
          },
        },
      },
    })),
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/cart`,
    metadata: {
      orderId: order.id,
      userId: user.id,
    },
  });

  await db.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  return NextResponse.json({ url: session.url });
}
