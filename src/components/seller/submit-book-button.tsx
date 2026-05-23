"use client";

import { useState } from "react";
import { GlassButton } from "@/components/ui/glass";

export function SubmitBookButton({ bookId }: { bookId: string }) {
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await fetch(`/api/seller/books/${bookId}/submit`, { method: "POST" });
    window.location.reload();
  }

  return (
    <GlassButton onClick={submit} disabled={loading}>
      {loading ? "..." : "Submit for review"}
    </GlassButton>
  );
}
