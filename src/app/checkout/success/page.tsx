import Link from "next/link";
"use client";

import { Suspense, useCallback, useState } from "react";
import { CheckCircle } from "lucide-react";
import { GlassPanel, GlassButton } from "@/components/ui/glass";
import { ConfirmCheckoutSession } from "@/components/checkout/confirm-session";

export default function CheckoutSuccessPage() {
  const [status, setStatus] = useState<"confirming" | "paid" | "failed">("confirming");
  const updateStatus = useCallback((nextStatus: "confirming" | "paid" | "failed") => setStatus(nextStatus), []);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 md:px-8">
      <Suspense fallback={null}>
        <ConfirmCheckoutSession onStatusChange={updateStatus} />
      </Suspense>
      <GlassPanel className="p-10 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-400" />
        <h1 className="mt-6 text-2xl font-bold text-white">
          {status === "paid" ? "Payment successful" : status === "failed" ? "Payment confirmation needed" : "Confirming your payment"}
        </h1>
        <p className="mt-3 text-zinc-400">
          {status === "paid"
            ? "Your books are now in your library. You can download them anytime."
            : status === "failed"
              ? "We could not confirm this payment yet. If you were charged, refresh this page in a moment or contact support with your payment reference."
              : "Please wait while we securely confirm your payment and add your books to your library."}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/library" aria-disabled={status !== "paid"} className={status !== "paid" ? "pointer-events-none opacity-50" : ""}>
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
