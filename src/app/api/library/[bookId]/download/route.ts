import { NextResponse } from "next/server";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBlobUrl, openPrivateFileStream, privateFileExists } from "@/lib/storage";

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

  const pdfKey = entry.book.pdfKey;
  if (!(await privateFileExists(pdfKey))) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const blobUrl = getBlobUrl(pdfKey);
  if (blobUrl) {
    const response = await fetch(blobUrl);
    if (!response.ok || !response.body) return NextResponse.json({ error: "File not found" }, { status: 404 });
    return new NextResponse(response.body, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${entry.book.slug}.pdf"`, "Cache-Control": "private, no-store" },
    });
  }
  const stream = openPrivateFileStream(pdfKey);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  const filename = `${entry.book.slug}.pdf`;
  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
