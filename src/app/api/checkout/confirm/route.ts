import { NextResponse } from "next/server";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { fulfillOrderByPaystackReference } from "@/lib/orders";
import { verifyPaystackTransaction } from "@/lib/paystack";

export async function POST(req: Request) {
  const user = await syncUserFromClerk();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reference } = (await req.json()) as { reference?: string };
  if (!reference) {
    return NextResponse.json({ error: "reference required" }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { paystackReference: reference },
  });

  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const verified = await verifyPaystackTransaction(reference);
  if (verified.status !== "success") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
  }

  if (verified.amount !== order.totalCents) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  const metadata = verified.metadata as { userId?: string } | undefined;
  if (metadata?.userId && metadata.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await fulfillOrderByPaystackReference(reference);

  return NextResponse.json({ ok: true, status: "PAID" });
}
