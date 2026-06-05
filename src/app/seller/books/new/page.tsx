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
      <h1 className="mb-8 text-3xl font-bold text-white">Add new book</h1>
      <BookForm categories={categories} />
    </div>
  );
}
