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

  /**
   * =========================
   * 2. FETCH SELLER SUBACCOUNT
   * =========================
   */
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
   * 3. IDEMPOTENCY LOCK (STEP 10 CORE FIX)
   * =========================
   *
   * Rule:
   * A user can ONLY have ONE active Paystack reference per pending checkout
   */

  let order = await db.order.findFirst({
    where: {
      userId: user.id,
      status: OrderStatus.PENDING,
      paystackReference: { not: null },
    },
    include: { items: true },
  });

  /**
   * If existing valid pending order exists → reuse it
   */
  if (order?.paystackReference) {
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

    return NextResponse.json({
      url: payment.authorization_url,
      reference: order.paystackReference,
      reused: true,
    });
  }

  /**
   * =========================
   * 4. PLATFORM FEE CALCULATION
   * =========================
   */
  const platformFeeCents = Math.floor(subtotalCents * 0.1);
  const totalAmountCents = subtotalCents + platformFeeCents;

  /**
   * =========================
   * 5. CREATE ORDER (ONLY IF NONE EXISTS)
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

  const reference = paystackReferenceForOrder(order.id);

  /**
   * =========================
   * 6. INIT PAYSTACK TRANSACTION
   * =========================
   */
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
   * 7. SAVE REFERENCE (LOCK IT)
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
}
