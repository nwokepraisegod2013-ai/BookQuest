"use client";

import { useRef, useState } from "react";
import { GlassButton } from "@/components/ui/glass";

export function CheckoutButton() {
  const [loading, setLoading] = useState(false);

  /**
   * Prevent duplicate requests at function level
   */
  const requestInFlight = useRef(false);

  async function checkout() {
    if (loading || requestInFlight.current) return;

    setLoading(true);
    requestInFlight.current = true;

    try {
      /**
       * IMPORTANT:
       * Must match your real backend route
       */
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const rawResponse = await res.text();
      let data: { error?: string; url?: string; reference?: string };
      try {
        data = rawResponse ? JSON.parse(rawResponse) : {
          error: "The payment service returned an empty response. Please try again shortly.",
        };
      } catch {
        data = { error: "The payment service returned an invalid response. Please try again shortly." };
      }

      if (!res.ok) {
        throw new Error(data?.error || "Checkout failed");
      }

      /**
       * Paystack redirect
       */
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      /**
       * If reused session exists (idempotency case)
       */
      if (data.reference) {
        window.location.href = `/checkout/success?reference=${data.reference}`;
        return;
      }

      throw new Error("Invalid payment response");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";

      alert(message);
    } finally {
      setLoading(false);
      requestInFlight.current = false;
    }
  }

  return (
    <GlassButton
      onClick={checkout}
      disabled={loading}
      className="px-8 py-3 text-base opacity-100 disabled:opacity-60"
    >
      {loading ? "Processing Payment..." : "Pay with Paystack"}
    </GlassButton>
  );
}
