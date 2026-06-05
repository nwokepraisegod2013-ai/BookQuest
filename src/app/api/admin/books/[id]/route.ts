import { NextResponse } from "next/server";
import { BookStatus, Role } from "@prisma/client";
import { z } from "zod";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await syncUserFromClerk();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = z.object({ action: z.enum(["approve", "reject"]) }).safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { action } = parsed.data;

  await db.book.update({
    where: { id },
    data: {
      status: action === "approve" ? BookStatus.PUBLISHED : BookStatus.REJECTED,
      featured: action === "approve",
    },
  });

  return NextResponse.json({ ok: true });
}
