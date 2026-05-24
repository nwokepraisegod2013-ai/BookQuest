import { GlassPanel } from "@/components/ui/glass";

export default function ContactPage() {
  const email = process.env.SUPPORT_EMAIL ?? "support@bookquest.app";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <h1 className="mb-6 text-3xl font-bold text-white">Contact support</h1>
      <GlassPanel className="space-y-4 p-8 text-sm text-zinc-400">
        <p>For order issues, refunds, or seller questions, email us:</p>
        <p>
          <a href={`mailto:${email}`} className="text-lg text-blue-400 hover:text-blue-300">
            {email}
          </a>
        </p>
        <p>Include your account email and order reference (Paystack reference) when reporting payment problems.</p>
      </GlassPanel>
    </div>
  );
}
