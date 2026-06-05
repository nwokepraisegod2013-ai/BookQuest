import { syncUserFromClerk } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { Header } from "./header";
import { Footer } from "./footer";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await syncUserFromClerk();
  const cart = user ? await getCart(user.id).catch(() => null) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header cartCount={cart?.itemCount ?? 0} role={user?.role} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
