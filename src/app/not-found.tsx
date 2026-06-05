import Link from "next/link";
import { GlassPanel, GlassButton } from "@/components/ui/glass";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 md:px-8">
      <GlassPanel className="p-10 text-center">
        <h1 className="text-2xl font-bold text-white">Page not found</h1>
        <p className="mt-3 text-zinc-400">This page doesn&apos;t exist on BookQuest.</p>
        <Link href="/" className="mt-6 inline-block">
          <GlassButton>Back home</GlassButton>
        </Link>
      </GlassPanel>
    </div>
  );
}
