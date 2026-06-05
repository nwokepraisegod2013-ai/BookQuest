import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { syncUserFromClerk } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { GlassPanel, GlassButton } from "@/components/ui/glass";
import { formatPrice } from "@/lib/utils";

export default async function CheckoutPage() {
  const user = await syncUserFromClerk();

  if (!user) {
    redirect("/sign-in");
  }

  const { items, subtotalCents } = await getCart(user.id);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <GlassPanel className="p-10">
          <p className="text-zinc-400">Your cart is empty.</p>
          <Link href="/books" className="mt-4 inline-block text-blue-400">
            Browse books →
          </Link>
        </GlassPanel>
      </div>
    );
  }

  /**
   * =========================
   * PLATFORM FEE (10%)
   * =========================
   */
  const platformFeeCents = Math.floor(subtotalCents * 0.1);
  const totalCents = subtotalCents + platformFeeCents;

  /**
   * =========================
   * HANDLE PAYMENT
   * =========================
   */
  async function handleCheckout() {
    const res = await fetch("/api/checkout", {
      method: "POST",
    });

    const data = await res.json();

    if (data?.url) {
      window.location.href = data.url;
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <h1 className="mb-6 text-3xl font-bold text-white">Checkout</h1>

      <div className="grid gap-6 md:grid-cols-3">
        {/* =========================
            LEFT: ITEMS
        ========================= */}
        <div className="md:col-span-2 space-y-4">
          {items.map((item) => (
            <GlassPanel key={item.id} className="flex gap-4 p-4">
              <div className="relative h-20 w-14 overflow-hidden rounded-md">
                <Image
                  src={item.book.coverUrl}
                  alt={item.book.title}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex-1">
                <p className="font-medium text-white">
                  {item.book.title}
                </p>

                <p className="text-xs text-zinc-500">
                  {item.book.seller.storeName}
                </p>

                <p className="mt-2 text-sm text-blue-300">
                  {formatPrice(item.priceCents)}
                </p>
              </div>
            </GlassPanel>
          ))}
        </div>

        {/* =========================
            RIGHT: SUMMARY
        ========================= */}
        <div className="space-y-4">
          <GlassPanel className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Order Summary
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>{formatPrice(subtotalCents)}</span>
              </div>

              <div className="flex justify-between text-zinc-400">
                <span>Platform fee (10%)</span>
                <span>{formatPrice(platformFeeCents)}</span>
              </div>

              <div className="border-t border-white/10 pt-2 flex justify-between text-white font-semibold">
                <span>Total</span>
                <span>{formatPrice(totalCents)}</span>
              </div>
            </div>

            {/* =========================
                PAY BUTTON
            ========================= */}
            <GlassButton
              className="mt-6 w-full"
              onClick={handleCheckout}
            >
              Pay now
            </GlassButton>

            <p className="mt-3 text-center text-xs text-zinc-500">
              Includes a 10% BookQuest service fee, billed on top of item prices.
            </p>
            <p className="text-center text-xs text-zinc-500">
              Secure payment powered by Paystack.
            </p>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
