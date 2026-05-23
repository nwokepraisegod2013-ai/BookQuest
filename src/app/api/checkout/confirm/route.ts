import { NextResponse } from "next/server";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { fulfillOrderFromSession } from "@/lib/orders";

export async function POST(req: Request) {
  const user = await syncUserFromClerk();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = (await req.json()) as { sessionId?: string };
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { stripeSessionId: sessionId },
  });

  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await fulfillOrderFromSession(sessionId);

  return NextResponse.json({ ok: true, status: "PAID" });
}
