import { NextResponse } from "next/server";
import { BookStatus } from "@prisma/client";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUploadedFile } from "@/lib/storage";
import { connectAuthors, getUploadedFile, parseSellerBookFields } from "@/lib/seller-book";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await syncUserFromClerk();
  if (!user?.sellerProfile) {
    return NextResponse.json({ error: "Seller profile required" }, { status: 403 });
  }

  const { id } = await params;
  const book = await db.book.findFirst({
    where: { id, sellerId: user.sellerProfile.id },
  });

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const fd = await req.formData();
  const cover = getUploadedFile(fd, "cover");
  const pdf = getUploadedFile(fd, "pdf");
  const sample = getUploadedFile(fd, "sample");

  try {
    const fields = await parseSellerBookFields(fd);
    const bookData = {
      title: fields.title, subtitle: fields.subtitle, description: fields.description,
      priceCents: fields.priceCents, salePriceCents: fields.salePriceCents,
      categoryId: fields.categoryId, language: fields.language, isbn: fields.isbn, pageCount: fields.pageCount,
    };
    let coverUrl = book.coverUrl;
    let pdfKey = book.pdfKey;
    let samplePdfKey = book.samplePdfKey;

    if (cover) coverUrl = await saveUploadedFile(cover, "covers");
    if (pdf) pdfKey = await saveUploadedFile(pdf, "pdfs");
    if (sample) samplePdfKey = await saveUploadedFile(sample, "samples");
    const authors = await connectAuthors(fields.authorNames);

    const updated = await db.book.update({
      where: { id },
      data: {
        ...bookData,
        coverUrl,
        pdfKey,
        samplePdfKey,
        authors: { set: authors },
        // Any edit withdraws a listing from review/public display until the seller submits it again.
        status: BookStatus.DRAFT,
      },
    });

    return NextResponse.json({ id: updated.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
