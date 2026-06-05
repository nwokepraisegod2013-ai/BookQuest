"use client";

import { useState } from "react";
import { GlassPanel, GlassButton, GlassInput, GlassTextarea } from "@/components/ui/glass";

export function ReviewForm({ bookId }: { bookId: string }) {
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId,
        rating,
        title: fd.get("title"),
        body: fd.get("body"),
      }),
    });
    window.location.reload();
  }

  return (
    <GlassPanel className="p-4">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-zinc-400">Write a review (verified purchase)</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`text-2xl ${n <= rating ? "text-amber-400" : "text-zinc-600"}`}
            >
              ★
            </button>
          ))}
        </div>
        <GlassInput name="title" placeholder="Review title (optional)" />
        <GlassTextarea name="body" placeholder="Your thoughts..." />
        <GlassButton type="submit" disabled={loading}>
          {loading ? "Posting..." : "Post review"}
        </GlassButton>
      </form>
    </GlassPanel>
  );
}
