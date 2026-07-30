import { z } from "zod";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

const bookFieldsSchema = z.object({
  title: z.string().trim().min(1, "Enter a book title").max(180),
  subtitle: z.string().trim().max(240),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(5000),
  price: z.coerce.number().int().min(100, "Minimum price is ₦100"),
  salePrice: z.union([z.literal(""), z.coerce.number().int().min(100)]),
  categoryId: z.string().trim(),
  authors: z.string().trim().max(500),
  language: z.string().trim().min(2).max(10),
  isbn: z.string().trim().max(32),
  pageCount: z.union([z.literal(""), z.coerce.number().int().min(1).max(10000)]),
});

export type SellerBookFields = {
  title: string;
  subtitle: string | null;
  description: string;
  priceCents: number;
  salePriceCents: number | null;
  categoryId: string | null;
  authorNames: string[];
  language: string;
  isbn: string | null;
  pageCount: number | null;
};

export async function parseSellerBookFields(formData: FormData): Promise<SellerBookFields> {
  const result = bookFieldsSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle") ?? "",
    description: formData.get("description"),
    price: formData.get("price"),
    salePrice: formData.get("salePrice") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    authors: formData.get("authors") ?? "",
    language: formData.get("language") ?? "en",
    isbn: formData.get("isbn") ?? "",
    pageCount: formData.get("pageCount") ?? "",
  });

  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid form data");
  const value = result.data;
  const salePrice = value.salePrice === "" ? null : value.salePrice;
  if (salePrice !== null && salePrice >= value.price) {
    throw new Error("Sale price must be below regular price");
  }

  const categoryId = value.categoryId || null;
  if (categoryId && !(await db.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    throw new Error("Choose a valid category");
  }

  return {
    title: value.title,
    subtitle: value.subtitle || null,
    description: value.description,
    priceCents: value.price * 100,
    salePriceCents: salePrice === null ? null : salePrice * 100,
    categoryId,
    authorNames: [...new Set(value.authors.split(",").map((name) => name.trim()).filter(Boolean))],
    language: value.language.toLowerCase(),
    isbn: value.isbn || null,
    pageCount: value.pageCount === "" ? null : value.pageCount,
  };
}

export async function connectAuthors(authorNames: string[]) {
  return Promise.all(
    authorNames.map(async (name) => {
      const baseSlug = slugify(name) || "author";
      let slug = baseSlug;
      let suffix = 2;
      while (true) {
        const existing = await db.author.findUnique({ where: { slug } });
        if (!existing || existing.name.toLowerCase() === name.toLowerCase()) break;
        slug = `${baseSlug}-${suffix++}`;
      }
      const author = await db.author.upsert({
        where: { slug },
        create: { name, slug },
        update: {},
      });
      return { id: author.id };
    })
  );
}

export function getUploadedFile(formData: FormData, name: string): File | null {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}
