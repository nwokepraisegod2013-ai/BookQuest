import { GlassPanel } from "@/components/ui/glass";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <h1 className="mb-6 text-3xl font-bold text-white">Privacy policy</h1>
      <GlassPanel className="space-y-4 p-8 text-sm text-zinc-400">
        <p>
          We collect account information through Clerk (email, name, profile image) and order data
          required to fulfill purchases. Payment card details are handled by Stripe and never stored
          on BookQuest servers.
        </p>
        <p>
          We use your email for receipts, library access, and support. You may request account
          deletion by contacting support; purchase records may be retained for legal and tax
          compliance.
        </p>
        <p>
          Uploaded PDFs are stored securely and served only to users who have purchased the title.
        </p>
      </GlassPanel>
    </div>
  );
}
