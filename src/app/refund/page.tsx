import Link from "next/link";
import { GlassPanel } from "@/components/ui/glass";

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <h1 className="mb-6 text-3xl font-bold text-white">Refund policy</h1>
      <GlassPanel className="space-y-4 p-8 text-sm text-zinc-400">
        <p>
          Digital PDF purchases on BookQuest are generally non-refundable once the file has
          been delivered to your library, except where required by law or where the listing was
          materially misdescribed.
        </p>
        <p>
          To request a review, contact support within 7 days of purchase with your order details.
          Approved refunds are processed via Paystack to your original payment method.
        </p>
        <p>
          <Link href="/contact" className="text-blue-400 hover:text-blue-300">
            Contact support →
          </Link>
        </p>
      </GlassPanel>
    </div>
  );
}
