import { notFound, redirect } from "next/navigation";
import { syncUserFromClerk } from "@/lib/auth";
import { BookForm } from "@/components/seller/book-form";
import { db } from "@/lib/db";

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await syncUserFromClerk();
  if (!user?.sellerProfile) redirect("/seller/apply");

  const { id } = await params;
  const book = await db.book.findFirst({
    where: { id, sellerId: user.sellerProfile.id },
  });

  if (!book) notFound();

  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="mb-8 text-3xl font-bold text-white">Edit book</h1>
      <BookForm
        categories={categories}
        book={{
          id: book.id,
          title: book.title,
          subtitle: book.subtitle,
          description: book.description,
          priceCents: book.priceCents,
          categoryId: book.categoryId,
          coverUrl: book.coverUrl,
        }}
      />
    </div>
  );
}
