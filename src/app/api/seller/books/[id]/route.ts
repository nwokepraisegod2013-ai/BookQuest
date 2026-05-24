import { NextResponse } from "next/server";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUploadedFile } from "@/lib/storage";

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
  const title = String(fd.get("title") ?? book.title);
  const description = String(fd.get("description") ?? book.description);
  const priceNgn = parseInt(String(fd.get("price") ?? book.priceCents / 100), 10);
  const saleRaw = String(fd.get("salePrice") ?? "").trim();
  const saleNgn = saleRaw ? parseInt(saleRaw, 10) : null;
  const categoryId = String(fd.get("categoryId") ?? "") || null;

  if (!title || !description || priceNgn < 100) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  if (saleNgn !== null && (saleNgn < 100 || saleNgn >= priceNgn)) {
    return NextResponse.json({ error: "Sale price must be below regular price" }, { status: 400 });
  }

  const cover = fd.get("cover") as File | null;
  const pdf = fd.get("pdf") as File | null;
  const sample = fd.get("sample") as File | null;

  try {
    let coverUrl = book.coverUrl;
    let pdfKey = book.pdfKey;
    let samplePdfKey = book.samplePdfKey;

    if (cover && cover.size > 0) coverUrl = await saveUploadedFile(cover, "covers");
    if (pdf && pdf.size > 0) pdfKey = await saveUploadedFile(pdf, "pdfs");
    if (sample && sample.size > 0) samplePdfKey = await saveUploadedFile(sample, "samples");

    const updated = await db.book.update({
      where: { id },
      data: {
        title,
        subtitle: String(fd.get("subtitle") ?? "") || null,
        description,
        priceCents: priceNgn * 100,
        salePriceCents: saleNgn ? saleNgn * 100 : null,
        categoryId,
        coverUrl,
        pdfKey,
        samplePdfKey,
      },
    });

    return NextResponse.json({ id: updated.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
