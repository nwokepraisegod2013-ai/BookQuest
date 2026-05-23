import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await syncUserFromClerk();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.sellerProfile.update({
    where: { id },
    data: { verified: true },
  });

  return NextResponse.json({ ok: true });
}
