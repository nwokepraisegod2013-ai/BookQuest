"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ConfirmCheckoutSession({ onStatusChange }: { onStatusChange: (status: "confirming" | "paid" | "failed") => void }) {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  useEffect(() => {
    if (!reference) {
      onStatusChange("failed");
      return;
    }
    onStatusChange("confirming");
    fetch("/api/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Payment confirmation failed");
        const data = await response.json() as { status?: string };
        if (data.status !== "PAID") throw new Error("Payment confirmation failed");
        onStatusChange("paid");
      })
      .catch(() => onStatusChange("failed"));
  }, [onStatusChange, reference]);

  return null;
}
