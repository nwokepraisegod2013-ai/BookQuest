import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass";
import { formatPrice, getEffectivePriceCents } from "@/lib/utils";

type BookCardProps = {
  book: {
    slug: string;
    title: string;
    coverUrl: string;
    priceCents: number;
    salePriceCents: number | null;
    averageRating: number;
    reviewCount: number;
    seller: { storeName: string };
    category?: { name: string } | null;
  };
};

export function BookCard({ book }: BookCardProps) {
  const price = getEffectivePriceCents(book);
  const onSale = book.salePriceCents != null;

  return (
    <Link href={`/books/${book.slug}`} className="group block">
      <GlassPanel className="overflow-hidden transition duration-300 group-hover:border-blue-500/30 group-hover:bg-white/[0.07]">
        <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
          <Image
            src={book.coverUrl}
            alt={book.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {onSale && (
            <span className="absolute left-3 top-3 rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-semibold text-black">
              Sale
            </span>
          )}
        </div>
        <div className="space-y-2 p-4">
          {book.category && (
            <p className="text-xs uppercase tracking-wider text-zinc-500">{book.category.name}</p>
          )}
          <h3 className="line-clamp-2 font-medium text-white group-hover:text-blue-200">
            {book.title}
          </h3>
          <p className="text-xs text-zinc-500">{book.seller.storeName}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="text-xs text-zinc-300">
                {book.averageRating.toFixed(1)} ({book.reviewCount})
              </span>
            </div>
            <div className="text-right">
              {onSale && (
                <span className="mr-1 text-xs text-zinc-500 line-through">
                  {formatPrice(book.priceCents)}
                </span>
              )}
              <span className="font-semibold text-blue-300">{formatPrice(price)}</span>
            </div>
          </div>
        </div>
      </GlassPanel>
    </Link>
  );
}
