import { NextResponse } from "next/server";
import { BookStatus } from "@prisma/client";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUploadedFile } from "@/lib/storage";
import { slugify } from "@/lib/utils";

export async function POST(req: Request) {
  const user = await syncUserFromClerk();
  if (!user?.sellerProfile) {
    return NextResponse.json({ error: "Seller profile required" }, { status: 403 });
  }

  const fd = await req.formData();
  const title = String(fd.get("title") ?? "");
  const description = String(fd.get("description") ?? "");
  const priceNgn = parseInt(String(fd.get("price") ?? "0"), 10);
  const saleRaw = String(fd.get("salePrice") ?? "").trim();
  const saleNgn = saleRaw ? parseInt(saleRaw, 10) : null;
  const categoryId = String(fd.get("categoryId") ?? "") || null;

  const cover = fd.get("cover") as File | null;
  const pdf = fd.get("pdf") as File | null;
  const sample = fd.get("sample") as File | null;

  if (!title || !description || !cover || !pdf || priceNgn < 100) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  if (saleNgn !== null && (saleNgn < 100 || saleNgn >= priceNgn)) {
    return NextResponse.json({ error: "Sale price must be below regular price" }, { status: 400 });
  }

  const baseSlug = slugify(title);
  let slug = baseSlug;
  let n = 1;
  while (await db.book.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${n++}`;
  }

  try {
    const [coverUrl, pdfKey, samplePdfKey] = await Promise.all([
      saveUploadedFile(cover, "covers"),
      saveUploadedFile(pdf, "pdfs"),
      sample && sample.size > 0 ? saveUploadedFile(sample, "samples") : Promise.resolve(null),
    ]);

    const book = await db.book.create({
      data: {
        title,
        slug,
        subtitle: String(fd.get("subtitle") ?? "") || null,
        description,
        priceCents: priceNgn * 100,
        salePriceCents: saleNgn ? saleNgn * 100 : null,
        coverUrl,
        pdfKey,
        samplePdfKey,
        categoryId,
        sellerId: user.sellerProfile.id,
        status: BookStatus.DRAFT,
      },
    });

    return NextResponse.json({ id: book.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
