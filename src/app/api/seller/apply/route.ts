import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function POST(req: Request) {
  const user = await syncUserFromClerk();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.sellerProfile) {
    return NextResponse.json({ error: "Already a seller" }, { status: 400 });
  }

  const body = z
    .object({
      storeName: z.string().min(2).max(80),
      storeSlug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
      bio: z.string().max(500).optional().nullable(),
    })
    .parse(await req.json());

  const slug = slugify(body.storeSlug);
  const exists = await db.sellerProfile.findUnique({ where: { storeSlug: slug } });
  if (exists) {
    return NextResponse.json({ error: "Store slug taken" }, { status: 400 });
  }

  await db.$transaction([
    db.sellerProfile.create({
      data: {
        userId: user.id,
        storeName: body.storeName,
        storeSlug: slug,
        bio: body.bio ?? undefined,
        verified: false,
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: { role: Role.SELLER },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
