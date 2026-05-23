"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ConfirmCheckoutSession() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) return;
    fetch("/api/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
  }, [sessionId]);

  return null;
}
