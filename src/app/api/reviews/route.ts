import { NextResponse } from "next/server";
import { z } from "zod";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { recalculateBookRating } from "@/lib/books";

export async function POST(req: Request) {
  const user = await syncUserFromClerk();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = z
    .object({
      bookId: z.string(),
      rating: z.number().min(1).max(5),
      title: z.string().optional().nullable(),
      body: z.string().optional().nullable(),
    })
    .parse(await req.json());

  const owns = await db.libraryEntry.findUnique({
    where: { userId_bookId: { userId: user.id, bookId: body.bookId } },
  });
  if (!owns) {
    return NextResponse.json({ error: "Purchase required to review" }, { status: 403 });
  }

  await db.review.upsert({
    where: { userId_bookId: { userId: user.id, bookId: body.bookId } },
    create: {
      userId: user.id,
      bookId: body.bookId,
      rating: body.rating,
      title: body.title ?? undefined,
      body: body.body ?? undefined,
    },
    update: {
      rating: body.rating,
      title: body.title ?? undefined,
      body: body.body ?? undefined,
    },
  });

  await recalculateBookRating(body.bookId);

  return NextResponse.json({ ok: true });
}
