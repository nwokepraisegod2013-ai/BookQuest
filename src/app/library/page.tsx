import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { GlassPanel } from "@/components/ui/glass";
import { DownloadButton } from "@/components/library/download-button";

export default async function LibraryPage() {
  const user = await syncUserFromClerk();
  if (!user) redirect("/sign-in");

  const entries = await db.libraryEntry.findMany({
    where: { userId: user.id },
    include: {
      book: { include: { seller: true } },
    },
    orderBy: { grantedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="mb-2 text-3xl font-bold text-white">My library</h1>
      <p className="mb-8 text-zinc-400">{entries.length} books you own</p>

      {entries.length === 0 ? (
        <GlassPanel className="p-12 text-center text-zinc-400">
          No books yet. <Link href="/books" className="text-blue-400">Start browsing</Link>
        </GlassPanel>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(({ book, grantedAt }) => (
            <GlassPanel key={book.id} className="flex gap-4 p-4">
              <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg">
                <Image src={book.coverUrl} alt={book.title} fill className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link href={`/books/${book.slug}`} className="font-medium text-white hover:text-blue-300">
                    {book.title}
                  </Link>
                  <p className="text-xs text-zinc-500">{book.seller.storeName}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Added {new Date(grantedAt).toLocaleDateString()}
                  </p>
                </div>
                <DownloadButton bookId={book.id} slug={book.slug} />
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
