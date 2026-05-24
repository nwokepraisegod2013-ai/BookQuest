import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { syncUserFromClerk } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { db } from "@/lib/db";
import {
  initializePaystackTransaction,
  paystackReferenceForOrder,
  PAYSTACK_CURRENCY,
} from "@/lib/paystack";
import { getEffectivePriceCents } from "@/lib/utils";

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
      currency: PAYSTACK_CURRENCY.toLowerCase(),
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

  const reference = paystackReferenceForOrder(order.id);

  const payment = await initializePaystackTransaction({
    email: user.email,
    amountCents: subtotalCents,
    reference,
    callbackUrl: `${appUrl}/checkout/success?reference=${reference}`,
    metadata: {
      orderId: order.id,
      userId: user.id,
    },
  });

  await db.order.update({
    where: { id: order.id },
    data: { paystackReference: reference },
  });

  return NextResponse.json({ url: payment.authorization_url });
}
