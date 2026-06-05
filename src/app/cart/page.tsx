import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { syncUserFromClerk } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { GlassPanel, GlassButton } from "@/components/ui/glass";
import { formatPrice, getEffectivePriceCents } from "@/lib/utils";
import { CheckoutButton } from "@/components/cart/checkout-button";
import { RemoveFromCartButton } from "@/components/cart/remove-from-cart";

export default async function CartPage() {
  const user = await syncUserFromClerk();
  if (!user) redirect("/sign-in");

  const { items, subtotalCents } = await getCart(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="mb-8 text-3xl font-bold text-white">Your cart</h1>

      {items.length === 0 ? (
        <GlassPanel className="p-12 text-center">
          <p className="text-zinc-400">Your cart is empty.</p>
          <Link href="/books" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
            Browse books →
          </Link>
        </GlassPanel>
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <GlassPanel key={item.id} className="flex gap-4 p-4">
              <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg">
                <Image src={item.book.coverUrl} alt={item.book.title} fill className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link href={`/books/${item.book.slug}`} className="font-medium text-white hover:text-blue-300">
                    {item.book.title}
                  </Link>
                  <p className="text-xs text-zinc-500">{item.book.seller.storeName}</p>
                </div>
                <p className="font-semibold text-blue-300">
                  {formatPrice(getEffectivePriceCents(item.book))}
                </p>
              </div>
              <RemoveFromCartButton bookId={item.bookId} />
            </GlassPanel>
          ))}

          <GlassPanel className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-zinc-400">Subtotal</p>
              <p className="text-2xl font-bold text-white">{formatPrice(subtotalCents)}</p>
            </div>
            <CheckoutButton />
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
