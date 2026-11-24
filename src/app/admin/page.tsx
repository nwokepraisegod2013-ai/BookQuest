import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { GlassPanel } from "@/components/ui/glass";
import { formatPrice } from "@/lib/utils";
import { AdminBookActions } from "@/components/admin/book-actions";
import { SellerVerifyButton } from "@/components/admin/seller-verify-button";
import { PaySellerButton } from "@/components/admin/pay-seller-button";
import { getSellerSettlementSummary } from "@/lib/settlements";

export default async function AdminPage() {
  const user = await getAuthUser();
  if (!user || user.role !== Role.ADMIN) redirect("/");

  const [orderCount, revenue, pendingBooks, sellers, recentOrders, settings] = await Promise.all([
    db.order.count({ where: { status: "PAID" } }),
    db.order.aggregate({
      where: { status: "PAID" },
      _sum: { totalCents: true },
    }),
    db.book.findMany({
      where: { status: "PENDING_REVIEW" },
      include: { seller: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.sellerProfile.findMany({
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } }, items: { include: { book: true } } },
    }),
    db.platformSettings.findUnique({ where: { id: "default" } }),
  ]);
  const sellerSettlements = await Promise.all(sellers.map(async (seller) => ({ sellerId: seller.id, ...(await getSellerSettlementSummary(seller.id)) })));
  const settlementBySeller = new Map(sellerSettlements.map((summary) => [summary.sellerId, summary]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="mb-8 text-3xl font-bold text-white">Admin control</h1>

      <div className="mb-10 grid gap-4 md:grid-cols-3">
        <GlassPanel className="p-6">
          <p className="text-sm text-zinc-500">Paid orders</p>
          <p className="text-3xl font-bold text-white">{orderCount}</p>
        </GlassPanel>
        <GlassPanel className="p-6">
          <p className="text-sm text-zinc-500">Gross revenue</p>
          <p className="text-3xl font-bold text-white">
            {formatPrice(revenue._sum.totalCents ?? 0)}
          </p>
        </GlassPanel>
        <GlassPanel className="p-6">
          <p className="text-sm text-zinc-500">Pending reviews</p>
          <p className="text-3xl font-bold text-amber-400">{pendingBooks.length}</p>
        </GlassPanel>
      </div>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">Books pending approval</h2>
        {pendingBooks.length === 0 ? (
          <GlassPanel className="p-6 text-zinc-500">No pending listings.</GlassPanel>
        ) : (
          <div className="space-y-3">
            {pendingBooks.map((book) => (
              <GlassPanel key={book.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-white">{book.title}</p>
                  <p className="text-sm text-zinc-500">
                    {book.seller.storeName} · {formatPrice(book.priceCents)}
                  </p>
                </div>
                <AdminBookActions bookId={book.id} />
              </GlassPanel>
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">Sellers</h2>
        <div className="overflow-x-auto">
          <GlassPanel className="p-4">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="pb-2">Store</th>
                  <th className="pb-2">Owner</th>
                  <th className="pb-2">Payout account</th>
                  <th className="pb-2">Eligible</th>
                  <th className="pb-2">Verified</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => (
                  (() => {
                    const settlement = settlementBySeller.get(s.id);
                    const canPay = Boolean(s.transferRecipientCode) && (settlement?.availableCents ?? 0) >= (settings?.minPayoutCents ?? 500000);
                    return (
                  <tr key={s.id} className="border-t border-white/5 text-zinc-300">
                    <td className="py-2">
                      <Link href={`/store/${s.storeSlug}`} className="text-blue-400 hover:underline">
                        {s.storeName}
                      </Link>
                    </td>
                    <td className="py-2">{s.user.email}</td>
                    <td className="py-2">{s.accountNumber ? `${s.bankName ?? "Bank"} · ${s.accountNumber}` : "Not set"}</td>
                    <td className="py-2 text-green-300">{formatPrice(settlement?.availableCents ?? 0)}</td>
                    <td className="py-2">{s.verified ? "Yes" : "No"}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2"><SellerVerifyButton sellerId={s.id} verified={s.verified} /><PaySellerButton sellerId={s.id} disabled={!canPay} /></div>
                    </td>
                  </tr>
                    );
                  })()
                ))}
              </tbody>
            </table>
          </GlassPanel>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">Recent orders</h2>
        <div className="space-y-2">
          {recentOrders.map((order) => (
            <GlassPanel key={order.id} className="p-4 text-sm">
              <span className="text-white">{order.user.email}</span>
              <span className="mx-2 text-zinc-600">·</span>
              <span className={order.status === "PAID" ? "text-green-400" : "text-zinc-400"}>
                {order.status}
              </span>
              <span className="mx-2 text-zinc-600">·</span>
              <span className="text-blue-300">{formatPrice(order.totalCents)}</span>
              <p className="mt-1 text-zinc-500">
                {order.items.map((i) => i.book.title).join(", ")}
              </p>
            </GlassPanel>
          ))}
        </div>
      </section>
    </div>
  );
}
