"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { GlassButton } from "@/components/ui/glass";

export function DownloadButton({ bookId }: { bookId: string }) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const res = await fetch(`/api/library/${bookId}/download`);
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
      else alert(data.error ?? "Download unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassButton variant="ghost" onClick={download} disabled={loading} className="mt-2 w-full text-sm">
      <Download className="h-4 w-4" />
      {loading ? "Preparing..." : "Download PDF"}
    </GlassButton>
  );
}
