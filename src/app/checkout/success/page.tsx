import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle } from "lucide-react";
import { GlassPanel, GlassButton } from "@/components/ui/glass";
import { ConfirmCheckoutSession } from "@/components/checkout/confirm-session";

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 py-16 md:px-8">
      <div className="w-full">
        {/* =======================
            SESSION CONFIRMATION
        ======================= */}
        <Suspense
          fallback={
            <div className="mb-6 text-center text-sm text-zinc-400">
              Confirming your payment...
            </div>
          }
        >
          <ConfirmCheckoutSession />
        </Suspense>

        {/* =======================
            SUCCESS CARD
        ======================= */}
        <GlassPanel className="p-10 text-center">
          {/* ICON */}
          <div className="flex justify-center">
            <div className="rounded-full bg-green-500/10 p-4">
              <CheckCircle className="h-14 w-14 text-green-400" />
            </div>
          </div>

          {/* TITLE */}
          <h1 className="mt-6 text-2xl font-bold text-white">
            Payment successful
          </h1>

          {/* DESCRIPTION */}
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Your purchase is complete. The books you bought have been added to
            your library and are available for instant access anytime.
          </p>

          {/* OPTIONAL INFO BLOCK (future-ready) */}
          <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-zinc-400">
            Tip: You can always re-download your books from your library page.
          </div>

          {/* ACTIONS */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/library" className="w-full sm:w-auto">
              <GlassButton className="w-full sm:w-auto">
                Go to library
              </GlassButton>
            </Link>

            <Link href="/books" className="w-full sm:w-auto">
              <GlassButton variant="ghost" className="w-full sm:w-auto">
                Continue shopping
              </GlassButton>
            </Link>
          </div>

          {/* SECONDARY ACTION (optional trust UX) */}
          <div className="mt-6 text-xs text-zinc-500">
            Need help? Contact support from your account dashboard.
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
