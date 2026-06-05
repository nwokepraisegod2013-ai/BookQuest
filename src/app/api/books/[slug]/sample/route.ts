import { NextResponse } from "next/server";
import { publishedBookWhere } from "@/lib/books";
import { db } from "@/lib/db";
import { openPrivateFileStream, privateFileExists } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const book = await db.book.findFirst({
    where: { slug, ...publishedBookWhere, samplePdfKey: { not: null } },
  });

  if (!book?.samplePdfKey) {
    return NextResponse.json({ error: "No sample" }, { status: 404 });
  }

  if (!(await privateFileExists(book.samplePdfKey))) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const stream = openPrivateFileStream(book.samplePdfKey);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${book.slug}-sample.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
