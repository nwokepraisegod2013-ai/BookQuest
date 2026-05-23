import { redirect } from "next/navigation";
import Link from "next/link";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { GlassPanel } from "@/components/ui/glass";
import { formatPrice } from "@/lib/utils";

export default async function AccountPage() {
  const user = await syncUserFromClerk();
  if (!user) redirect("/sign-in");

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { book: true } } },
    take: 20,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="mb-2 text-3xl font-bold text-white">Account</h1>
      <p className="mb-8 text-zinc-400">{user.email}</p>

      <h2 className="mb-4 text-xl font-semibold text-white">Order history</h2>
      {orders.length === 0 ? (
        <GlassPanel className="p-8 text-center text-zinc-500">No orders yet.</GlassPanel>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <GlassPanel key={order.id} className="p-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">
                  {new Date(order.createdAt).toLocaleString()}
                </span>
                <span
                  className={
                    order.status === "PAID" ? "text-green-400" : "text-zinc-400"
                  }
                >
                  {order.status}
                </span>
              </div>
              <p className="mt-2 font-medium text-blue-300">
                {formatPrice(order.totalCents)}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                {order.items.map((item) => (
                  <li key={item.id}>
                    <Link href={`/books/${item.book.slug}`} className="hover:text-white">
                      {item.book.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
