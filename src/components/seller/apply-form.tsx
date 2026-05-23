"use client";

import { useState } from "react";
import { GlassPanel, GlassButton, GlassInput, GlassTextarea } from "@/components/ui/glass";

export function SellerApplyForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/seller/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName: fd.get("storeName"),
        storeSlug: fd.get("storeSlug"),
        bio: fd.get("bio"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to apply");
      setLoading(false);
      return;
    }
    window.location.href = "/seller";
  }

  return (
    <GlassPanel className="p-6">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Store name</label>
          <GlassInput name="storeName" required placeholder="Acme Publishing" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Store URL slug</label>
          <GlassInput name="storeSlug" required placeholder="acme-publishing" pattern="[a-z0-9-]+" />
          <p className="mt-1 text-xs text-zinc-600">Lowercase letters, numbers, hyphens only</p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Bio</label>
          <GlassTextarea name="bio" placeholder="Tell readers about your store..." />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <GlassButton type="submit" disabled={loading} className="w-full">
          {loading ? "Submitting..." : "Apply to sell"}
        </GlassButton>
      </form>
    </GlassPanel>
  );
}
