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
    console.log("[PAYMENT FAILED] Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items, subtotalCents } = await getCart(user.id);

  console.log("[CART FETCHED]", {
    userId: user.id,
    itemsCount: items.length,
    subtotalCents,
  });

  if (!items.length) {
    console.log("[PAYMENT STOPPED] Empty cart");
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  /**
   * =========================
   * 1. SINGLE SELLER VALIDATION
   * =========================
   */
  const sellerIds = [...new Set(items.map((i) => i.book.sellerId))];

  if (sellerIds.length > 1) {
    console.log("[PAYMENT BLOCKED] Multi-seller cart detected", {
      sellerIds,
    });

    return NextResponse.json(
      {
        error:
          "Multiple sellers in one checkout is not supported in current Paystack split setup.",
      },
      { status: 400 }
    );
  }

  const sellerId = sellerIds[0];

  /**
   * =========================
   * 2. FETCH SELLER SUBACCOUNT
   * =========================
   */
  const seller = await db.sellerProfile.findUnique({
    where: { id: sellerId },
  });

  if (!seller?.subaccountCode) {
    console.log("[PAYMENT BLOCKED] Seller missing subaccount", {
      sellerId,
    });

    return NextResponse.json(
      { error: "Seller payout not configured" },
      { status: 400 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  /**
   * =========================
   * 3. IDEMPOTENCY LOCK (REUSE CHECK)
   * =========================
   */
  let order = await db.order.findFirst({
    where: {
      userId: user.id,
      status: OrderStatus.PENDING,
      paystackReference: { not: null },
    },
    include: { items: true },
  });

  if (order?.paystackReference) {
    console.log("[PAYMENT REUSE] Existing order reused", {
      orderId: order.id,
      reference: order.paystackReference,
    });

    try {
      const payment = await initializePaystackTransaction({
        email: user.email,
        amountCents: order.totalCents,
        reference: order.paystackReference,
        callbackUrl: `${appUrl}/checkout/success?reference=${order.paystackReference}`,
        metadata: {
          orderId: order.id,
          userId: user.id,
        },
        subaccountCode: seller.subaccountCode,
        transactionChargeCents: Math.floor(order.totalCents * 0.1),
        bearer: "account",
      });

      console.log("[PAYSTACK INIT SUCCESS - REUSE]", {
        orderId: order.id,
      });

      return NextResponse.json({
        url: payment.authorization_url,
        reference: order.paystackReference,
        reused: true,
      });
    } catch (err) {
      console.error("[PAYSTACK REUSE INIT FAILED]", {
        orderId: order.id,
        error: err,
      });

      return NextResponse.json(
        { error: "Payment retry failed. Please try again." },
        { status: 500 }
      );
    }
  }

  /**
   * =========================
   * 4. PLATFORM FEE CALCULATION
   * =========================
   */
  const platformFeeCents = Math.floor(subtotalCents * 0.1);
  const totalAmountCents = subtotalCents + platformFeeCents;

  console.log("[FEE CALCULATED]", {
    subtotalCents,
    platformFeeCents,
    totalAmountCents,
  });

  /**
   * =========================
   * 5. CREATE ORDER
   * =========================
   */
  order = await db.order.create({
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

  console.log("[ORDER CREATED]", {
    orderId: order.id,
    userId: user.id,
  });

  const reference = paystackReferenceForOrder(order.id);

  /**
   * =========================
   * 6. INIT PAYSTACK TRANSACTION
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

    console.log("[PAYSTACK INIT SUCCESS]", {
      orderId: order.id,
      reference,
    });

    /**
     * =========================
     * 7. SAVE REFERENCE
     * =========================
     */
    await db.order.update({
      where: { id: order.id },
      data: {
        paystackReference: reference,
      },
    });

    console.log("[ORDER UPDATED WITH REFERENCE]", {
      orderId: order.id,
      reference,
    });

    return NextResponse.json({
      url: payment.authorization_url,
      reference,
      reused: false,
    });
  } catch (err) {
    console.error("[PAYSTACK INIT FAILED]", {
      orderId: order.id,
      error: err,
    });

    return NextResponse.json(
      {
        error: "Payment initialization failed. Please retry.",
        orderId: order.id,
        retryable: true,
      },
      { status: 500 }
    );
  }
}
