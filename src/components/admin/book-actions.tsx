"use client";

import { GlassButton } from "@/components/ui/glass";

export function AdminBookActions({ bookId }: { bookId: string }) {
  async function action(type: "approve" | "reject") {
    await fetch(`/api/admin/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: type }),
    });
    window.location.reload();
  }

  return (
    <div className="flex gap-2">
      <GlassButton onClick={() => action("approve")}>Approve</GlassButton>
      <GlassButton variant="danger" onClick={() => action("reject")}>
        Reject
      </GlassButton>
    </div>
  );
}
