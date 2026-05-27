import { NextResponse } from "next/server";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderStatus } from "@prisma/client";

/**
 * =========================
 * SELLER EARNINGS DASHBOARD API
 * =========================
 */
export async function GET(req: Request) {
  const user = await syncUserFromClerk();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!user.sellerProfile) {
    return NextResponse.json(
      { error: "Seller profile required" },
      { status: 403 }
    );
  }

  const url = new URL(req.url);

  /**
   * OPTIONAL FILTERS
   */
  const from = url.searchParams.get("from"); // ISO date
  const to = url.searchParams.get("to"); // ISO date

  const dateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {};

  /**
   * =========================
   * FETCH ALL PAID ORDERS
   * =========================
   */
  const orders = await db.order.findMany({
    where: {
      status: OrderStatus.PAID,
      items: {
        some: {
          sellerId: user.sellerProfile.id,
        },
      },
      ...dateFilter,
    },
    include: {
      items: true,
    },
  });

  /**
   * =========================
   * CALCULATIONS
   * =========================
   */
  let grossCents = 0;
  let platformFeeCents = 0;
  let netCents = 0;

  const orderBreakdown = orders.map((order) => {
    const sellerItems = order.items.filter(
      (item) => item.sellerId === user.sellerProfile!.id
    );

    const orderGross = sellerItems.reduce(
      (sum, item) => sum + item.priceCents,
      0
    );

    const orderFee = Math.floor(orderGross * 0.1);
    const orderNet = orderGross - orderFee;

    grossCents += orderGross;
    platformFeeCents += orderFee;
    netCents += orderNet;

    return {
      orderId: order.id,
      grossCents: orderGross,
      feeCents: orderFee,
      netCents: orderNet,
      date: order.createdAt,
    };
  });

  /**
   * =========================
   * RESPONSE
   * =========================
   */
  return NextResponse.json({
    summary: {
      grossCents,
      platformFeeCents,
      netCents,
      orderCount: orders.length,
    },
    orders: orderBreakdown,
  });
}