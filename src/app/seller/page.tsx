import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, BookOpen, DollarSign, WalletCards, Clock3, TrendingUp } from "lucide-react";
import { Role } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { GlassPanel, GlassButton, GlassBadge } from "@/components/ui/glass";
import { formatPrice } from "@/lib/utils";
import { SubmitBookButton } from "@/components/seller/submit-book-button";
import { PayoutAccountForm } from "@/components/seller/payout-account-form";
import { getSellerSettlementSummary } from "@/lib/settlements";
import { decryptAccountNumber } from "@/lib/payout-account";

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

  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [settlement, salesThisMonth, recentSales, payouts] = sellerId
    ? await Promise.all([
        getSellerSettlementSummary(sellerId),
        db.orderItem.aggregate({ where: { sellerId, order: { status: "PAID", createdAt: { gte: monthStart } } }, _sum: { sellerEarningsCents: true } }),
        db.orderItem.findMany({ where: { sellerId, order: { status: "PAID" } }, include: { book: { select: { title: true } }, order: { select: { createdAt: true } } }, orderBy: { order: { createdAt: "desc" } }, take: 5 }),
        db.payout.findMany({ where: { sellerId }, orderBy: { createdAt: "desc" }, take: 5 }),
      ])
    : [{ availableCents: 0, onHoldCents: 0, paidCents: 0, cutoff: new Date() }, { _sum: { sellerEarningsCents: 0 } }, [], []] as const;

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

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <GlassPanel className="flex items-center gap-4 p-6">
          <BookOpen className="h-10 w-10 text-blue-400" />
          <div>
            <p className="text-sm text-zinc-500">Listings</p>
            <p className="text-2xl font-bold text-white">{books.length}</p>
          </div>
        </GlassPanel>
        <GlassPanel className="flex items-center gap-4 p-6">
          <WalletCards className="h-10 w-10 text-green-400" />
          <div>
            <p className="text-sm text-zinc-500">Available to settle</p>
            <p className="text-2xl font-bold text-white">
              {formatPrice(settlement.availableCents)}
            </p>
          </div>
        </GlassPanel>
        <GlassPanel className="flex items-center gap-4 p-6"><Clock3 className="h-10 w-10 text-amber-400" /><div><p className="text-sm text-zinc-500">In 7-day hold</p><p className="text-2xl font-bold text-white">{formatPrice(settlement.onHoldCents)}</p></div></GlassPanel>
        <GlassPanel className="flex items-center gap-4 p-6"><TrendingUp className="h-10 w-10 text-blue-400" /><div><p className="text-sm text-zinc-500">This month</p><p className="text-2xl font-bold text-white">{formatPrice(salesThisMonth._sum.sellerEarningsCents ?? 0)}</p></div></GlassPanel>
      </div>

      {user.sellerProfile && <div className="mb-8"><PayoutAccountForm account={{ ...user.sellerProfile, accountNumber: decryptAccountNumber(user.sellerProfile.accountNumber) }} /></div>}

      {user.sellerProfile && <div className="mb-10 grid gap-6 lg:grid-cols-2"><GlassPanel className="p-6"><h2 className="text-lg font-semibold text-white">Recent sales</h2><div className="mt-4 space-y-3">{recentSales.length ? recentSales.map((sale) => <div key={sale.id} className="flex justify-between border-b border-white/5 pb-3 text-sm"><div><p className="text-zinc-200">{sale.book.title}</p><p className="text-zinc-500">{sale.order.createdAt.toLocaleDateString()}</p></div><p className="font-medium text-green-300">{formatPrice(sale.sellerEarningsCents)}</p></div>) : <p className="text-sm text-zinc-500">Sales will appear here after a customer pays.</p>}</div></GlassPanel><GlassPanel className="p-6"><h2 className="text-lg font-semibold text-white">Settlement history</h2><div className="mt-4 space-y-3">{payouts.length ? payouts.map((payout) => <div key={payout.id} className="flex justify-between border-b border-white/5 pb-3 text-sm"><div><p className="text-zinc-200">{payout.status.replaceAll("_", " ")}</p><p className="text-zinc-500">{payout.createdAt.toLocaleDateString()}</p></div><p className="font-medium text-blue-300">{formatPrice(payout.amountCents)}</p></div>) : <p className="text-sm text-zinc-500">No settlements have been issued yet.</p>}</div></GlassPanel></div>}

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
