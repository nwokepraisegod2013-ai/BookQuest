import Link from "next/link";
import { GlassPanel } from "@/components/ui/glass";

export function Footer() {
  return (
    <footer className="px-4 py-8 md:px-8">
      <GlassPanel className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-lg font-semibold text-white">BookQuest</p>
            <p className="mt-2 max-w-md text-sm text-zinc-400">
              Nigeria&apos;s marketplace for premium PDF books. Buy once, read forever in your library.
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-zinc-300">Shop</p>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><Link href="/books" className="hover:text-white">All books</Link></li>
              <li><Link href="/library" className="hover:text-white">My library</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-zinc-300">Sell</p>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><Link href="/seller/apply" className="hover:text-white">Become a seller</Link></li>
              <li><Link href="/seller" className="hover:text-white">Seller dashboard</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-zinc-300">Help</p>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link href="/refund" className="hover:text-white">Refunds</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-8 flex flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-6 text-center text-xs text-zinc-600">
          <Link href="/terms" className="hover:text-zinc-400">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-zinc-400">
            Privacy
          </Link>
          <span>© {new Date().getFullYear()} BookQuest · Paystack (NGN)</span>
        </p>
      </GlassPanel>
    </footer>
  );
}
