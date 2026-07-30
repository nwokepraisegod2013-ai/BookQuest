import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, BookOpen, DollarSign } from "lucide-react";
import { Role } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { GlassPanel, GlassButton, GlassBadge } from "@/components/ui/glass";
import { formatPrice } from "@/lib/utils";
import { SubmitBookButton } from "@/components/seller/submit-book-button";

export default async function SellerDashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/sign-in");
  if (user.role !== Role.SELLER && user.role !== Role.ADMIN) {
    redirect("/seller/apply");
  }
  if (!user.sellerProfile && user.role !== Role.ADMIN) redirect("/seller/apply");

  const sellerId = user.sellerProfile?.id;
  const books = sellerId
    ? await db.book.findMany({
        where: { sellerId },
        orderBy: { updatedAt: "desc" },
        include: { category: true },
      })
    : [];

  const earnings = sellerId
    ? await db.orderItem.aggregate({
        where: { sellerId, order: { status: "PAID" } },
        _sum: { sellerEarningsCents: true },
      })
    : { _sum: { sellerEarningsCents: 0 } };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Seller dashboard</h1>
          {user.sellerProfile && (
            <p className="mt-1 text-zinc-400">
              {user.sellerProfile.storeName}
              {!user.sellerProfile.verified && (
                <GlassBadge className="ml-2">Pending verification</GlassBadge>
              )}
            </p>
          )}
        </div>
        {user.sellerProfile ? (
          <a
            href="/seller/books/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-600/90 to-indigo-600/90 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:from-blue-500 hover:to-indigo-500"
          >
            <Plus className="h-4 w-4" /> Upload a book
          </a>
        ) : (
          <Link
            href="/seller/apply"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-600/90 to-indigo-600/90 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:from-blue-500 hover:to-indigo-500"
          >
            <Plus className="h-4 w-4" /> Set up seller profile
          </Link>
        )}
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <GlassPanel className="flex items-center gap-4 p-6">
          <BookOpen className="h-10 w-10 text-blue-400" />
          <div>
            <p className="text-sm text-zinc-500">Listings</p>
            <p className="text-2xl font-bold text-white">{books.length}</p>
          </div>
        </GlassPanel>
        <GlassPanel className="flex items-center gap-4 p-6">
          <DollarSign className="h-10 w-10 text-green-400" />
          <div>
            <p className="text-sm text-zinc-500">Total earnings</p>
            <p className="text-2xl font-bold text-white">
              {formatPrice(earnings._sum.sellerEarningsCents ?? 0)}
            </p>
          </div>
        </GlassPanel>
      </div>

      <h2 className="mb-4 text-xl font-semibold text-white">Your books</h2>
      {!user.sellerProfile && (
        <GlassPanel className="mb-6 p-6 text-zinc-400">
          Set up a seller profile to upload books. This identifies the store shown to readers on each listing.
        </GlassPanel>
      )}
      {books.length === 0 ? (
        <GlassPanel className="p-8 text-center text-zinc-400">
          No books yet. Upload your first PDF book.
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {books.map((book) => (
            <GlassPanel key={book.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-white">{book.title}</p>
                <p className="text-sm text-zinc-500">
                  {book.status.replaceAll("_", " ")} · {formatPrice(book.priceCents)} · {book.salesCount} sales
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/seller/books/${book.id}/edit`}>
                  <GlassButton variant="ghost">Edit</GlassButton>
                </Link>
                {(book.status === "DRAFT" || book.status === "REJECTED") && (
                  <SubmitBookButton bookId={book.id} />
                )}
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
