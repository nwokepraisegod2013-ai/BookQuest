import { BookStatus, Prisma } from "@prisma/client";
import { db } from "./db";

export const publishedBookWhere: Prisma.BookWhereInput = {
  status: BookStatus.PUBLISHED,
};

export async function getPublishedBooks(params?: {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 12;
  const skip = (page - 1) * limit;

  const where: Prisma.BookWhereInput = {
    ...publishedBookWhere,
    ...(params?.search
      ? {
          OR: [
            { title: { contains: params.search, mode: "insensitive" } },
            { description: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(params?.category
      ? { category: { slug: params.category } }
      : {}),
  };

  let orderBy: Prisma.BookOrderByWithRelationInput = { createdAt: "desc" };
  if (params?.sort === "price-asc") orderBy = { priceCents: "asc" };
  if (params?.sort === "price-desc") orderBy = { priceCents: "desc" };
  if (params?.sort === "popular") orderBy = { salesCount: "desc" };
  if (params?.sort === "rating") orderBy = { averageRating: "desc" };

  const [books, total] = await Promise.all([
    db.book.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        seller: true,
        category: true,
        authors: true,
      },
    }),
    db.book.count({ where }),
  ]);

  return { books, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getBookBySlug(slug: string) {
  return db.book.findFirst({
    where: { slug, ...publishedBookWhere },
    include: {
      seller: true,
      category: true,
      authors: true,
      reviews: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, imageUrl: true } } },
      },
    },
  });
}

export async function recalculateBookRating(bookId: string) {
  const agg = await db.review.aggregate({
    where: { bookId },
    _avg: { rating: true },
    _count: true,
  });
  await db.book.update({
    where: { id: bookId },
    data: {
      averageRating: agg._avg.rating ?? 0,
      reviewCount: agg._count,
    },
  });
}
