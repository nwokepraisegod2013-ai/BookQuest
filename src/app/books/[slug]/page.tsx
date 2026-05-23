import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Store } from "lucide-react";
import { getBookBySlug } from "@/lib/books";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { GlassPanel, GlassBadge } from "@/components/ui/glass";
import { formatPrice, getEffectivePriceCents } from "@/lib/utils";
import { AddToCartButton } from "@/components/books/add-to-cart-button";
import { ReviewForm } from "@/components/books/review-form";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  const user = await syncUserFromClerk();
  const ownsBook = user
    ? await db.libraryEntry.findUnique({
        where: { userId_bookId: { userId: user.id, bookId: book.id } },
      })
    : null;

  const price = getEffectivePriceCents(book);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <GlassPanel className="relative aspect-[3/4] max-h-[600px] overflow-hidden">
          <Image src={book.coverUrl} alt={book.title} fill className="object-cover" priority />
        </GlassPanel>

        <div className="space-y-6">
          {book.category && <GlassBadge>{book.category.name}</GlassBadge>}
          <h1 className="text-3xl font-bold text-white md:text-4xl">{book.title}</h1>
          {book.subtitle && <p className="text-lg text-zinc-400">{book.subtitle}</p>}

          <Link
            href={`/store/${book.seller.storeSlug}`}
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
          >
            <Store className="h-4 w-4" />
            {book.seller.storeName}
          </Link>

          <div className="flex items-center gap-2 text-amber-400">
            <Star className="h-5 w-5 fill-current" />
            <span className="text-white">
              {book.averageRating.toFixed(1)} · {book.reviewCount} reviews · {book.salesCount} sold
            </span>
          </div>

          <p className="text-3xl font-bold text-blue-300">{formatPrice(price)}</p>
          <p className="leading-relaxed text-zinc-400">{book.description}</p>

          {book.authors.length > 0 && (
            <p className="text-sm text-zinc-500">
              By {book.authors.map((a) => a.name).join(", ")}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {ownsBook ? (
              <Link
                href="/library"
                className="rounded-xl bg-green-600/80 px-6 py-3 font-medium text-white"
              >
                In your library — open
              </Link>
            ) : (
              <AddToCartButton bookId={book.id} />
            )}
            {book.samplePdfKey && (
              <a
                href={book.samplePdfKey}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 px-6 py-3 text-sm text-zinc-300 hover:bg-white/5"
              >
                Read sample
              </a>
            )}
          </div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="mb-6 text-xl font-semibold text-white">Reviews</h2>
        {user && ownsBook && <ReviewForm bookId={book.id} />}
        <div className="mt-6 space-y-4">
          {book.reviews.length === 0 ? (
            <GlassPanel className="p-8 text-center text-zinc-500">No reviews yet.</GlassPanel>
          ) : (
            book.reviews.map((r) => (
              <GlassPanel key={r.id} className="p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{r.user.name ?? "Reader"}</span>
                  <span className="text-amber-400">{"★".repeat(r.rating)}</span>
                </div>
                {r.title && <p className="mt-1 font-medium text-zinc-300">{r.title}</p>}
                {r.body && <p className="mt-2 text-sm text-zinc-400">{r.body}</p>}
              </GlassPanel>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
