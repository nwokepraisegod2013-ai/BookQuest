import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle } from "lucide-react";
import { GlassPanel, GlassButton } from "@/components/ui/glass";
import { ConfirmCheckoutSession } from "@/components/checkout/confirm-session";

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 md:px-8">
      <Suspense fallback={null}>
        <ConfirmCheckoutSession />
      </Suspense>
      <GlassPanel className="p-10 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-400" />
        <h1 className="mt-6 text-2xl font-bold text-white">Payment successful</h1>
        <p className="mt-3 text-zinc-400">
          Your books are now in your library. You can download them anytime.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/library">
            <GlassButton className="w-full sm:w-auto">Go to library</GlassButton>
          </Link>
          <Link href="/books">
            <GlassButton variant="ghost" className="w-full sm:w-auto">
              Keep shopping
            </GlassButton>
          </Link>
        </div>
      </GlassPanel>
    </div>
  );
}
