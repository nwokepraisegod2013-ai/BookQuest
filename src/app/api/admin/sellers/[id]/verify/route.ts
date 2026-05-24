import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await syncUserFromClerk();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = z
    .object({ verified: z.boolean().optional() })
    .safeParse(req.headers.get("content-type")?.includes("json") ? await req.json() : {});

  const verified = parsed.success && parsed.data.verified !== undefined ? parsed.data.verified : true;

  await db.sellerProfile.update({
    where: { id },
    data: { verified },
  });

  return NextResponse.json({ ok: true, verified });
}
