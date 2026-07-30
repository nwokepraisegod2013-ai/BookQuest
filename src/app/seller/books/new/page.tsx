import { redirect } from "next/navigation";
import { syncUserFromClerk } from "@/lib/auth";
import { BookForm } from "@/components/seller/book-form";
import { db } from "@/lib/db";

export default async function NewBookPage() {
  const user = await syncUserFromClerk();
  if (!user?.sellerProfile) redirect("/seller/apply");

  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="mb-2 text-3xl font-bold text-white">Upload a book</h1>
      <p className="mb-8 text-zinc-400">Add your book details, cover image, and PDF file. You can submit the draft for review when it is ready.</p>
      <BookForm categories={categories} />
    </div>
  );
}
