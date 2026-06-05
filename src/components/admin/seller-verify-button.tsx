"use client";

import { GlassButton } from "@/components/ui/glass";

export function SellerVerifyButton({
  sellerId,
  verified,
}: {
  sellerId: string;
  verified: boolean;
}) {
  async function setVerified(next: boolean) {
    await fetch(`/api/admin/sellers/${sellerId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: next }),
    });
    window.location.reload();
  }

  if (verified) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-green-400">Verified</span>
        <GlassButton variant="ghost" onClick={() => setVerified(false)} className="text-xs">
          Revoke
        </GlassButton>
      </div>
    );
  }

  return (
    <GlassButton onClick={() => setVerified(true)} className="text-xs">
      Verify seller
    </GlassButton>
  );
}
