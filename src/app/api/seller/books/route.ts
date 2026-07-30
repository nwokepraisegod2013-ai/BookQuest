import { NextResponse } from "next/server";
import { BookStatus } from "@prisma/client";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUploadedFile } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import { connectAuthors, getUploadedFile, parseSellerBookFields } from "@/lib/seller-book";

export async function POST(req: Request) {
  const user = await syncUserFromClerk();
  if (!user?.sellerProfile) {
    return NextResponse.json({ error: "Seller profile required" }, { status: 403 });
  }

  const fd = await req.formData();
  const cover = getUploadedFile(fd, "cover");
  const pdf = getUploadedFile(fd, "pdf");
  const sample = getUploadedFile(fd, "sample");
  if (!cover || !pdf) return NextResponse.json({ error: "A cover image and PDF are required" }, { status: 400 });

  try {
    const fields = await parseSellerBookFields(fd);
    const bookData = {
      title: fields.title, subtitle: fields.subtitle, description: fields.description,
      priceCents: fields.priceCents, salePriceCents: fields.salePriceCents,
      categoryId: fields.categoryId, language: fields.language, isbn: fields.isbn, pageCount: fields.pageCount,
    };
    const baseSlug = slugify(fields.title) || "book";
    let slug = baseSlug;
    let n = 2;
    while (await db.book.findUnique({ where: { slug } })) slug = `${baseSlug}-${n++}`;
    const [coverUrl, pdfKey, samplePdfKey] = await Promise.all([
      saveUploadedFile(cover, "covers"),
      saveUploadedFile(pdf, "pdfs"),
      sample ? saveUploadedFile(sample, "samples") : Promise.resolve(null),
    ]);
    const authors = await connectAuthors(fields.authorNames);

    const book = await db.book.create({
      data: {
        ...bookData,
        slug,
        coverUrl,
        pdfKey,
        samplePdfKey,
        sellerId: user.sellerProfile.id,
        status: BookStatus.DRAFT,
        authors: { connect: authors },
      },
    });

    return NextResponse.json({ id: book.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
