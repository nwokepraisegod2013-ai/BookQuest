import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { db } from "@/lib/db";
import {
  initializePaystackTransaction,
  paystackReferenceForOrder,
  PAYSTACK_CURRENCY,
} from "@/lib/paystack";

export async function POST() {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json(
      { error: "Payments are not configured. Add PAYSTACK_SECRET_KEY to this Vercel project's Production environment." },
      { status: 503 }
    );
    }

    const user = await getAuthUser();

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

    const orderItems = items.map((item) => ({
      bookId: item.book.id,
      sellerId: item.book.sellerId,
      priceCents: item.book.salePriceCents ?? item.book.priceCents,
    }));

    const orderPayload = {
    totalCents,
    currency: PAYSTACK_CURRENCY.toLowerCase(),
    items: {
      deleteMany: {},
      create: orderItems,
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
        totalCents,
        currency: PAYSTACK_CURRENCY.toLowerCase(),
        items: { create: orderItems },
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
    console.error("[CHECKOUT FAILED]", error);
    const message = error instanceof Error ? error.message : "Unknown Paystack error";
    return NextResponse.json(
      { error: `Payment initialization failed: ${message}`, retryable: true },
      { status: 500 }
    );
  }
}
