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

export async function POST() {
  const user = await syncUserFromClerk();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items, subtotalCents } = await getCart(user.id);

  if (!items.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const PLATFORM_FEE_PERCENT = 10;
  const platformFeeCents = Math.floor(
    (subtotalCents * PLATFORM_FEE_PERCENT) / 100
  );
  const totalCents = subtotalCents + platformFeeCents;

  let order = await db.order.findFirst({
    where: {
      userId: user.id,
      status: OrderStatus.PENDING,
    },
  });

  const orderPayload = {
    totalCents,
    currency: PAYSTACK_CURRENCY.toLowerCase(),
    items: {
      deleteMany: {},
      create: items.map((item) => ({
        bookId: item.book.id,
        sellerId: item.book.sellerId,
        priceCents: item.book.salePriceCents ?? item.book.priceCents,
      })),
    },
  };

  if (order) {
    order = await db.order.update({
      where: { id: order.id },
      data: orderPayload,
    });
  } else {
    order = await db.order.create({
      data: {
        userId: user.id,
        status: OrderStatus.PENDING,
        ...orderPayload,
      },
    });
  }

  const reference =
    order.paystackReference ?? paystackReferenceForOrder(order.id);

  if (!order.paystackReference) {
    order = await db.order.update({
      where: { id: order.id },
      data: { paystackReference: reference },
    });
  }

  try {
    const payment = await initializePaystackTransaction({
      email: user.email,
      amountCents: totalCents,
      reference,
      callbackUrl: `${APP_URL}/checkout/success?reference=${reference}`,
      metadata: {
        orderId: order.id,
        userId: user.id,
        platformFeeCents: String(platformFeeCents),
      },
      bearer: "account",
    });

    return NextResponse.json({
      url: payment.authorization_url,
      reference,
      reused: Boolean(order.paystackReference),
    });
  } catch (error) {
    console.error("[PAYSTACK INIT FAILED]", error);
    return NextResponse.json(
      { error: "Payment initialization failed", retryable: true },
      { status: 500 }
    );
  }
}
