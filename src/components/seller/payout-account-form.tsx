"use client";

import { useState } from "react";
import { GlassButton, GlassInput, GlassPanel } from "@/components/ui/glass";

export function PayoutAccountForm({ account }: { account?: { bankName: string | null; bankCode: string | null; accountName: string | null; accountNumber: string | null } }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/seller/payout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Payout account saved and ready for admin settlement." : data.error ?? "Could not save payout account.");
    setLoading(false);
  }
  return <GlassPanel className="p-6"><div className="mb-5"><h2 className="text-lg font-semibold text-white">Payout account</h2><p className="mt-1 text-sm text-zinc-400">Settlements are released by BookQuest after a seven-working-day hold.</p></div><form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><label className="text-sm text-zinc-400">Bank name<GlassInput name="bankName" required defaultValue={account?.bankName ?? ""} placeholder="Access Bank" /></label><label className="text-sm text-zinc-400">Bank code<GlassInput name="bankCode" required defaultValue={account?.bankCode ?? ""} placeholder="044" /></label><label className="text-sm text-zinc-400">Account name<GlassInput name="accountName" required defaultValue={account?.accountName ?? ""} placeholder="Account holder name" /></label><label className="text-sm text-zinc-400">Account number<GlassInput name="accountNumber" required inputMode="numeric" maxLength={10} defaultValue={account?.accountNumber ?? ""} placeholder="0123456789" /></label><div className="md:col-span-2"><GlassButton type="submit" disabled={loading}>{loading ? "Saving..." : "Save payout account"}</GlassButton>{message && <p className={`mt-3 text-sm ${message.startsWith("Payout") ? "text-green-400" : "text-red-400"}`}>{message}</p>}</div></form></GlassPanel>;
}
