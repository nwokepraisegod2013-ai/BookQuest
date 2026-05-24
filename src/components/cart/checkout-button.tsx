"use client";

import { useState } from "react";
import { GlassButton } from "@/components/ui/glass";

export function CheckoutButton() {
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassButton onClick={checkout} disabled={loading} className="px-8 py-3 text-base">
      {loading ? "Redirecting..." : "Pay with Paystack"}
    </GlassButton>
  );
}
