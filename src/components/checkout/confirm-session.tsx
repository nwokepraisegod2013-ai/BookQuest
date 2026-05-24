"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ConfirmCheckoutSession() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  useEffect(() => {
    if (!reference) return;
    fetch("/api/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    }).catch(() => {});
  }, [reference]);

  return null;
}
