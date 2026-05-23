import { NextResponse } from "next/server";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { publishedBookWhere } from "@/lib/books";
import { z } from "zod";

export async function POST(req: Request) {
  const user = await syncUserFromClerk();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = z.object({ bookId: z.string() }).parse(await req.json());

  const book = await db.book.findFirst({
    where: { id: body.bookId, ...publishedBookWhere },
  });
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const owned = await db.libraryEntry.findUnique({
    where: { userId_bookId: { userId: user.id, bookId: book.id } },
  });
  if (owned) return NextResponse.json({ error: "Already owned" }, { status: 400 });

  await db.cartItem.upsert({
    where: { userId_bookId: { userId: user.id, bookId: book.id } },
    create: { userId: user.id, bookId: book.id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await syncUserFromClerk();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookId = new URL(req.url).searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ error: "bookId required" }, { status: 400 });

  await db.cartItem.deleteMany({
    where: { userId: user.id, bookId },
  });

  return NextResponse.json({ ok: true });
}
