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

  /**
   * =========================
   * 1. SINGLE SELLER VALIDATION
   * =========================
   */
  const sellerIds = [...new Set(items.map((i) => i.book.sellerId))];

  if (sellerIds.length > 1) {
    return NextResponse.json(
      {
        error:
          "Multiple sellers in one checkout is not supported in current Paystack split setup.",
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
   * 2. IDEMPOTENCY: REUSE ACTIVE ORDER (CRITICAL)
   * =========================
   */
  const existingOrder = await db.order.findFirst({
    where: {
      userId: user.id,
      status: OrderStatus.PENDING,
    },
    include: { items: true },
  });

  /**
   * If order already has Paystack reference → retry initialization safely
   */
  if (existingOrder?.paystackReference) {
    try {
      const payment = await initializePaystackTransaction({
        email: user.email,
        amountCents: existingOrder.totalCents,
        reference: existingOrder.paystackReference,
        callbackUrl: `${appUrl}/checkout/success?reference=${existingOrder.paystackReference}`,
        metadata: {
          orderId: existingOrder.id,
          userId: user.id,
        },
        subaccountCode: seller.subaccountCode,
        transactionChargeCents: Math.floor(existingOrder.totalCents * 0.1),
        bearer: "account",
      });

      return NextResponse.json({
        url: payment.authorization_url,
        reference: existingOrder.paystackReference,
        reused: true,
      });
    } catch (err) {
      console.error("[PAYSTACK RETRY FAILED]", err);

      return NextResponse.json(
        {
          error:
            "Payment initialization failed. Please try again without losing your order.",
          reference: existingOrder.paystackReference,
        },
        { status: 500 }
      );
    }
  }

  /**
   * =========================
   * 3. PLATFORM FEE
   * =========================
   */
  const platformFeeCents = Math.floor(subtotalCents * 0.1);
  const totalAmountCents = subtotalCents + platformFeeCents;

  /**
   * =========================
   * 4. CREATE ORDER (ATOMIC)
   * =========================
   */
  const order = await db.$transaction(async (tx) => {
    return tx.order.create({
      data: {
        userId: user.id,
        status: OrderStatus.PENDING,
        totalCents: totalAmountCents,
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
  });

  const reference = paystackReferenceForOrder(order.id);

  /**
   * =========================
   * 5. INIT PAYSTACK (RETRY-SAFE)
   * =========================
   */
  try {
    const payment = await initializePaystackTransaction({
      email: user.email,
      amountCents: totalAmountCents,
      reference,
      callbackUrl: `${appUrl}/checkout/success?reference=${reference}`,
      metadata: {
        orderId: order.id,
        userId: user.id,
      },
      subaccountCode: seller.subaccountCode,
      transactionChargeCents: platformFeeCents,
      bearer: "account",
    });

    /**
     * =========================
     * 6. SAVE REFERENCE ONLY ON SUCCESS
     * =========================
     */
    await db.order.update({
      where: { id: order.id },
      data: {
        paystackReference: reference,
      },
    });

    return NextResponse.json({
      url: payment.authorization_url,
      reference,
      reused: false,
    });
  } catch (err) {
    /**
     * IMPORTANT:
     * DO NOT create a new order on retry.
     * Keep order in PENDING state for safe retry.
     */
    console.error("[PAYSTACK INIT FAILED]", err);

    return NextResponse.json(
      {
        error: "Payment initialization failed. You can retry safely.",
        orderId: order.id,
        retryable: true,
      },
      { status: 500 }
    );
  }
}
