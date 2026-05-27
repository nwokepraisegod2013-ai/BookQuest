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

  console.log("[PAYMENT INIT START]", {
    userId: user?.id,
    time: new Date().toISOString(),
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items, subtotalCents } = await getCart(user.id);

  if (!items.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  /**
   * =========================
   * SINGLE SELLER RULE
   * =========================
   * (Required for Paystack subaccount routing)
   */
  const sellerIds = [...new Set(items.map((i) => i.book.sellerId))];

  if (sellerIds.length !== 1) {
    return NextResponse.json(
      {
        error:
          "Multi-seller checkout is not supported under current payout model.",
      },
      { status: 400 }
    );
  }

  const sellerId = sellerIds[0];

  const seller = await db.sellerProfile.findUnique({
    where: { id: sellerId },
  });

  if (!seller?.subaccountCode) {
    return NextResponse.json(
      { error: "Seller payout not configured" },
      { status: 400 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  /**
   * =========================
   * PLATFORM FEE MODEL
   * =========================
   *
   * IMPORTANT:
   * We define ONE source of truth:
   * - subtotalCents = real item total
   * - platformFee is added ON TOP
   */
  const PLATFORM_FEE_PERCENT = 10;

  const platformFeeCents = Math.floor(
    (subtotalCents * PLATFORM_FEE_PERCENT) / 100
  );

  const totalCents = subtotalCents + platformFeeCents;

  console.log("[FEE CALCULATION]", {
    subtotalCents,
    platformFeeCents,
    totalCents,
  });

  /**
   * =========================
   * IDEMPOTENCY CHECK
   * =========================
   */
  let order = await db.order.findFirst({
    where: {
      userId: user.id,
      status: OrderStatus.PENDING,
    },
  });

  let reference: string;

  if (order?.paystackReference) {
    reference = order.paystackReference;
  } else {
    order = await db.order.create({
      data: {
        userId: user.id,
        status: OrderStatus.PENDING,
        totalCents,
        currency: PAYSTACK_CURRENCY.toLowerCase(),
        items: {
          create: items.map((item) => ({
            bookId: item.book.id,
            sellerId: item.book.sellerId,
            priceCents: item.book.priceCents,
          })),
        },
      },
    });

    reference = paystackReferenceForOrder(order.id);

    await db.order.update({
      where: { id: order.id },
      data: { paystackReference: reference },
    });
  }

  /**
   * =========================
   * PAYSTACK INIT
   * =========================
   */
  try {
    const payment = await initializePaystackTransaction({
      email: user.email,
      amountCents: totalCents,
      reference,
      callbackUrl: `${appUrl}/checkout/success?reference=${reference}`,
      metadata: {
        orderId: order.id,
        userId: user.id,
      },
      subaccountCode: seller.subaccountCode,

      /**
       * IMPORTANT:
       * This is your platform earnings at Paystack level
       */
      transactionChargeCents: platformFeeCents,

      bearer: "account",
    });

    console.log("[PAYSTACK INIT SUCCESS]", {
      orderId: order.id,
      reference,
    });

    return NextResponse.json({
      url: payment.authorization_url,
      reference,
      reused: true,
    });
  } catch (err) {
    console.error("[PAYSTACK INIT FAILED]", err);

    return NextResponse.json(
      {
        error: "Payment initialization failed",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
