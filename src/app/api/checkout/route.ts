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

  if (items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  /**
   * =========================
   * 1. VALIDATE SINGLE SELLER
   * =========================
   */
  const sellerIds = [...new Set(items.map((i) => i.book.sellerId))];

  if (sellerIds.length > 1) {
    return NextResponse.json(
      {
        error:
          "Multiple sellers in one cart is not supported with Paystack split mode. Please checkout items separately.",
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
  const seller = await db.seller.findUnique({
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
   * 3. CREATE ORDER
   * =========================
   */
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
          priceCents: item.book.priceCents,
        })),
      },
    },
  });

  const reference = paystackReferenceForOrder(order.id);

  /**
   * =========================
   * 4. PLATFORM FEE (10%)
   * =========================
   */
  const platformFeeCents = Math.floor(subtotalCents * 0.1);

  /**
   * =========================
   * 5. INIT PAYSTACK SPLIT
   * =========================
   */
  const payment = await initializePaystackTransaction({
    email: user.email,

    amountCents: subtotalCents,

    reference,

    callbackUrl: `${appUrl}/checkout/success?reference=${reference}`,

    metadata: {
      orderId: order.id,
      userId: user.id,
    },

    /**
     * 🔥 PAYSTACK SPLIT CONFIG
     */
    subaccountCode: seller.subaccountCode,

    transactionChargeCents: platformFeeCents,

    bearer: "account",
  });

  /**
   * =========================
   * 6. SAVE REFERENCE
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
  });
}
