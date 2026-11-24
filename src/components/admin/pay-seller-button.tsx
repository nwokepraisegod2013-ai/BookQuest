"use client";
import { useState } from "react";
import { GlassButton } from "@/components/ui/glass";
export function PaySellerButton({ sellerId, disabled }: { sellerId: string; disabled: boolean }) {
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function pay() { if (!window.confirm("Send this seller's eligible balance through Paystack?")) return; setLoading(true); setError(""); const response = await fetch(`/api/admin/payouts/${sellerId}`, { method: "POST" }); const data = await response.json().catch(() => ({})); if (!response.ok) { setError(data.error ?? "Payout failed"); setLoading(false); return; } window.location.reload(); }
  return <div><GlassButton onClick={pay} disabled={disabled || loading} className="text-xs">{loading ? "Sending..." : "Pay eligible balance"}</GlassButton>{error && <p className="mt-1 max-w-48 text-xs text-red-400">{error}</p>}</div>;
}
