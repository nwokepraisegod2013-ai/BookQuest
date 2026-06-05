"use client";

import { Trash2 } from "lucide-react";

export function RemoveFromCartButton({ bookId }: { bookId: string }) {
  async function remove() {
    await fetch(`/api/cart?bookId=${bookId}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <button
      onClick={remove}
      className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
      aria-label="Remove"
    >
      <Trash2 className="h-5 w-5" />
    </button>
  );
}
