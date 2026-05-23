import { NextResponse } from "next/server";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const user = await syncUserFromClerk();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId } = await params;

  const entry = await db.libraryEntry.findUnique({
    where: { userId_bookId: { userId: user.id, bookId } },
    include: { book: true },
  });

  if (!entry) {
    return NextResponse.json({ error: "Not in library" }, { status: 403 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const pdfPath = entry.book.pdfKey;

  if (pdfPath.startsWith("/uploads/")) {
    return NextResponse.json({ url: `${appUrl}${pdfPath}` });
  }

  return NextResponse.json({ url: pdfPath });
}
