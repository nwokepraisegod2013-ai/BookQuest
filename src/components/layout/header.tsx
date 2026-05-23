"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { BookOpen, ShoppingCart, Library, Store, Shield } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass";

export function Header({ cartCount = 0, role }: { cartCount?: number; role?: string }) {
  return (
    <header className="sticky top-0 z-50 px-4 py-4 md:px-8">
      <GlassPanel className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white">
          <BookOpen className="h-7 w-7 text-blue-400" />
          <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-xl text-transparent">
            BookQuest
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
          <Link href="/books" className="transition hover:text-white">
            Browse
          </Link>
          <SignedIn>
            <Link href="/library" className="flex items-center gap-1 transition hover:text-white">
              <Library className="h-4 w-4" /> My Library
            </Link>
            <Link href="/cart" className="relative flex items-center gap-1 transition hover:text-white">
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cartCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link href="/account" className="transition hover:text-white">
              Account
            </Link>
            {(role === "SELLER" || role === "ADMIN") && (
              <Link href="/seller" className="flex items-center gap-1 transition hover:text-white">
                <Store className="h-4 w-4" /> Seller
              </Link>
            )}
            {role === "ADMIN" && (
              <Link href="/admin" className="flex items-center gap-1 text-amber-300 transition hover:text-amber-200">
                <Shield className="h-4 w-4" /> Admin
              </Link>
            )}
          </SignedIn>
        </nav>

        <div className="flex items-center gap-3">
          <SignedOut>
            <Link
              href="/sign-in"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Get started
            </Link>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </GlassPanel>
    </header>
  );
}
