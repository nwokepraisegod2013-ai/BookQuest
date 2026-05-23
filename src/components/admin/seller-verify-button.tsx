"use client";

import { GlassButton } from "@/components/ui/glass";

export function SellerVerifyButton({
  sellerId,
  verified,
}: {
  sellerId: string;
  verified: boolean;
}) {
  if (verified) {
    return <span className="text-sm text-green-400">Verified</span>;
  }

  async function verify() {
    await fetch(`/api/admin/sellers/${sellerId}/verify`, { method: "POST" });
    window.location.reload();
  }

  return (
    <GlassButton onClick={verify} className="text-xs">
      Verify seller
    </GlassButton>
  );
}
