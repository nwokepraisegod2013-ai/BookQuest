import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { publishedBookWhere } from "@/lib/books";
import { BookCard } from "@/components/books/book-card";
import { GlassPanel, GlassBadge } from "@/components/ui/glass";

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const seller = await db.sellerProfile.findUnique({
    where: { storeSlug: slug },
    include: {
      books: {
        where: publishedBookWhere,
        include: { seller: true, category: true, authors: true },
      },
    },
  });

  if (!seller) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <GlassPanel className="mb-10 p-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-white">{seller.storeName}</h1>
          {seller.verified && <GlassBadge>Verified seller</GlassBadge>}
        </div>
        {seller.bio && <p className="mt-4 max-w-2xl text-zinc-400">{seller.bio}</p>}
      </GlassPanel>

      <h2 className="mb-6 text-xl font-semibold text-white">Books</h2>
      {seller.books.length === 0 ? (
        <GlassPanel className="p-8 text-center text-zinc-500">No published books yet.</GlassPanel>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {seller.books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
