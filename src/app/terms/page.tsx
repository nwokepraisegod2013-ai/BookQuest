import { GlassPanel } from "@/components/ui/glass";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <h1 className="mb-6 text-3xl font-bold text-white">Terms of service</h1>
      <GlassPanel className="prose prose-invert max-w-none space-y-4 p-8 text-sm text-zinc-400">
        <p>
          BookQuest is a digital marketplace. Purchases grant a personal license to download and
          read PDFs in your library. Resale or redistribution of files is prohibited unless the
          seller explicitly allows it.
        </p>
        <p>
          Payments are processed in Nigerian Naira (NGN) via Paystack. Refunds follow our{" "}
          <a href="/refund" className="text-blue-400 hover:text-blue-300">
            refund policy
          </a>{" "}
          and applicable consumer protection laws for digital goods.
        </p>
        <p>
          Sellers are responsible for the content they list. BookQuest may remove listings that
          violate copyright or community guidelines.
        </p>
      </GlassPanel>
    </div>
  );
}
