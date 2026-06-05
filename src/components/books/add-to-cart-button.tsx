"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { GlassButton } from "@/components/ui/glass";

export function AddToCartButton({ bookId }: { bookId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function add() {
    setLoading(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      if (res.ok) {
        setDone(true);
        window.location.href = "/cart";
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassButton onClick={add} disabled={loading || done} className="px-6 py-3">
      <ShoppingCart className="h-4 w-4" />
      {loading ? "Adding..." : done ? "Added" : "Add to cart"}
    </GlassButton>
  );
}
