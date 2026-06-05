import Link from "next/link";
import { ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import { GlassPanel, GlassButton } from "@/components/ui/glass";
import { BookCard } from "@/components/books/book-card";
import { db } from "@/lib/db";
import { publishedBookWhere } from "@/lib/books";

export default async function HomePage() {
  const [featured, recent, categories] = await Promise.all([
    db.book.findMany({
      where: { ...publishedBookWhere, featured: true },
      take: 4,
      include: { seller: true, category: true, authors: true },
      orderBy: { salesCount: "desc" },
    }),
    db.book.findMany({
      where: publishedBookWhere,
      take: 8,
      include: { seller: true, category: true, authors: true },
      orderBy: { createdAt: "desc" },
    }),
    db.category.findMany({ take: 6, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="px-4 pb-16 md:px-8">
      <section className="mx-auto max-w-7xl py-12 md:py-20">
        <GlassPanel className="relative overflow-hidden px-8 py-16 md:px-16 md:py-24">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-indigo-600/15 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-300">
              <Sparkles className="h-4 w-4" /> PDF marketplace · Pay in NGN
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
              Your next great read is one click away
            </h1>
            <p className="mt-6 text-lg text-zinc-400">
              BookQuest connects readers with independent authors and publishers.
              Instant delivery to your personal library after checkout.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/books">
                <GlassButton className="px-6 py-3 text-base">
                  Browse books <ArrowRight className="h-4 w-4" />
                </GlassButton>
              </Link>
              <Link href="/seller/apply">
                <GlassButton variant="ghost" className="px-6 py-3 text-base">
                  Start selling
                </GlassButton>
              </Link>
            </div>
          </div>
        </GlassPanel>
      </section>

      <section className="mx-auto mb-16 grid max-w-7xl gap-4 md:grid-cols-3">
        {[
          { icon: Zap, title: "Instant access", desc: "PDFs in your library seconds after payment" },
          { icon: Shield, title: "Secure checkout", desc: "Paystack payments in Nigerian Naira" },
          { icon: Sparkles, title: "Curated marketplace", desc: "Verified sellers and reviewed listings" },
        ].map(({ icon: Icon, title, desc }) => (
          <GlassPanel key={title} className="p-6">
            <Icon className="mb-3 h-8 w-8 text-blue-400" />
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm text-zinc-400">{desc}</p>
          </GlassPanel>
        ))}
      </section>

      {categories.length > 0 && (
        <section className="mx-auto mb-16 max-w-7xl">
          <h2 className="mb-4 text-xl font-semibold text-white">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/books?category=${cat.slug}`}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition hover:border-blue-500/40 hover:text-white"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mx-auto mb-16 max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Featured</h2>
            <Link href="/books?sort=popular" className="text-sm text-blue-400 hover:text-blue-300">
              View all →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">New arrivals</h2>
          <Link href="/books" className="text-sm text-blue-400 hover:text-blue-300">
            Browse catalog →
          </Link>
        </div>
        {recent.length === 0 ? (
          <GlassPanel className="p-12 text-center text-zinc-400">
            No books yet. Run <code className="text-blue-300">npm run db:seed</code> or add listings as a seller.
          </GlassPanel>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
