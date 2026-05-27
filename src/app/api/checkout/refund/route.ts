import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { refundPaystackTransaction } from "@/lib/paystack";
import { OrderStatus } from "@prisma/client";
import { syncUserFromClerk } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await syncUserFromClerk();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /**
   * OPTIONAL: restrict to admin
   * (you should already have role system)
   */
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /**
   * =========================
   * VALIDATION
   * =========================
   */
  const body = z
    .object({
      orderId: z.string(),
      reason: z.string().optional(),
      amountCents: z.number().optional(), // partial refund support
    })
    .parse(await req.json());

  /**
   * =========================
   * FETCH ORDER
   * =========================
   */
  const order = await db.order.findUnique({
    where: { id: body.orderId },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  if (!order.paystackReference) {
    return NextResponse.json(
      { error: "No payment reference found" },
      { status: 400 }
    );
  }

  if (order.status !== OrderStatus.PAID) {
    return NextResponse.json(
      { error: "Only paid orders can be refunded" },
      { status: 400 }
    );
  }

  /**
   * =========================
   * CALL PAYSTACK REFUND
   * =========================
   */
  const refund = await refundPaystackTransaction({
    transactionReference: order.paystackReference,
    amountCents: body.amountCents,
    reason: body.reason,
  });

  /**
   * =========================
   * UPDATE ORDER STATE
   * =========================
   */
  await db.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.REFUNDED,
    },
  });

  /**
   * =========================
   * OPTIONAL AUDIT LOG
   * =========================
   */
  await db.paystackEvent.create({
    data: {
      id: `refund:${order.id}:${Date.now()}`,
      type: "refund.success",
    },
  });

  return NextResponse.json({
    ok: true,
    refund,
  });
}