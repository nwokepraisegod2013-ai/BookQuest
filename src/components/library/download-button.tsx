"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { GlassButton } from "@/components/ui/glass";

export function DownloadButton({ bookId, slug }: { bookId: string; slug: string }) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const res = await fetch(`/api/library/${bookId}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert((data as { error?: string }).error ?? "Download unavailable");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
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
