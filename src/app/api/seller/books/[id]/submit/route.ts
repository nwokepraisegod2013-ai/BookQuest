import { NextResponse } from "next/server";
import { BookStatus } from "@prisma/client";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { privateFileExists } from "@/lib/storage";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await syncUserFromClerk();
  if (!user?.sellerProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const book = await db.book.findFirst({
    where: { id, sellerId: user.sellerProfile.id },
  });

  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (book.status !== BookStatus.DRAFT && book.status !== BookStatus.REJECTED) {
    return NextResponse.json({ error: "This listing cannot be submitted right now" }, { status: 400 });
  }
  if (!(await privateFileExists(book.pdfKey))) {
    return NextResponse.json({ error: "The uploaded book file is missing. Please upload it again." }, { status: 400 });
  }

  await db.book.update({
    where: { id },
    data: { status: BookStatus.PENDING_REVIEW },
  });

  return NextResponse.json({ ok: true });
}
