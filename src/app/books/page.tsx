import { getPublishedBooks } from "@/lib/books";
import { db } from "@/lib/db";
import { BookCard } from "@/components/books/book-card";
import { GlassPanel, GlassInput } from "@/components/ui/glass";
import { BooksFilters } from "@/components/books/books-filters";

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const { books, pages, total } = await getPublishedBooks({
    search: params.search,
    category: params.category,
    sort: params.sort,
    page,
  });
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Browse books</h1>
        <p className="mt-2 text-zinc-400">{total} titles available</p>
      </div>

      <BooksFilters categories={categories} current={params} />

      {books.length === 0 ? (
        <GlassPanel className="mt-8 p-12 text-center text-zinc-400">
          No books match your filters.
        </GlassPanel>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/books?${new URLSearchParams({ ...params, page: String(p) } as Record<string, string>).toString()}`}
              className={`rounded-lg px-3 py-1 text-sm ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "border border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
