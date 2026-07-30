"use client";

import { useState } from "react";
import { GlassPanel, GlassButton, GlassInput, GlassTextarea } from "@/components/ui/glass";

type Category = { id: string; name: string };

export function BookForm({
  categories,
  book,
}: {
  categories: Category[];
  book?: {
    id: string;
    title: string;
    subtitle: string | null;
    description: string;
    priceCents: number;
    salePriceCents: number | null;
    categoryId: string | null;
    coverUrl: string;
    authors: { name: string }[];
    language: string;
    isbn: string | null;
    pageCount: number | null;
  };
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const url = book ? `/api/seller/books/${book.id}` : "/api/seller/books";
    const method = book ? "PATCH" : "POST";

    try {
      const res = await fetch(url, { method, body: fd });
      const responseType = res.headers.get("content-type") ?? "";
      const data = responseType.includes("application/json")
        ? await res.json()
        : { error: "The server could not process the upload. Please try again after checking your connection." };
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        setLoading(false);
        return;
      }
      window.location.href = "/seller";
    } catch {
      setError("Could not reach the server. Check your internet connection and try again.");
      setLoading(false);
    }
  }

  return (
    <GlassPanel className="p-6">
      <form onSubmit={submit} className="space-y-4" encType="multipart/form-data">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Title</label>
          <GlassInput name="title" required defaultValue={book?.title} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Subtitle</label>
          <GlassInput name="subtitle" defaultValue={book?.subtitle ?? ""} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Description</label>
          <GlassTextarea name="description" required defaultValue={book?.description} />
          <p className="mt-1 text-xs text-zinc-600">Tell readers what they will learn or experience (at least 20 characters).</p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Author(s)</label>
          <GlassInput name="authors" defaultValue={book?.authors.map((author) => author.name).join(", ") ?? ""} placeholder="Ada Okafor, Tunde Bello" />
          <p className="mt-1 text-xs text-zinc-600">Separate multiple authors with commas.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Price (NGN)</label>
          <GlassInput
            name="price"
            type="number"
            required
            min={100}
            step={1}
            defaultValue={book ? book.priceCents / 100 : ""}
            placeholder="2500"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Language</label>
            <GlassInput name="language" required defaultValue={book?.language ?? "en"} placeholder="en" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Page count</label>
            <GlassInput name="pageCount" type="number" min={1} defaultValue={book?.pageCount ?? ""} placeholder="180" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">ISBN (optional)</label>
          <GlassInput name="isbn" defaultValue={book?.isbn ?? ""} placeholder="978-..." />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Sale price (NGN, optional)</label>
          <GlassInput
            name="salePrice"
            type="number"
            min={100}
            step={1}
            defaultValue={book?.salePriceCents ? book.salePriceCents / 100 : ""}
            placeholder="1999"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Category</label>
          <select
            name="categoryId"
            defaultValue={book?.categoryId ?? ""}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-zinc-200"
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-2 text-sm text-zinc-400">Cover image{book ? " (leave empty to keep current)" : ""}</p>
          <input
            id="book-cover"
            name="cover"
            type="file"
            accept="image/*"
            required={!book}
            className="sr-only"
          />
          <label htmlFor="book-cover" className="inline-flex cursor-pointer items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10">
            Choose cover image
          </label>
        </div>
        <div>
          <p className="mb-2 text-sm text-zinc-400">Book PDF{book ? " (leave empty to keep current)" : ""}</p>
          <input
            id="book-pdf"
            name="pdf"
            type="file"
            accept="application/pdf"
            required={!book}
            className="sr-only"
          />
          <label htmlFor="book-pdf" className="inline-flex cursor-pointer items-center rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20">
            Choose PDF file
          </label>
          <p className="mt-1 text-xs text-zinc-600">PDF only, up to 50 MB. This file is delivered securely to buyers after purchase.</p>
        </div>
        <div>
          <p className="mb-2 text-sm text-zinc-400">Sample PDF (optional)</p>
          <input id="sample-pdf" name="sample" type="file" accept="application/pdf" className="sr-only" />
          <label htmlFor="sample-pdf" className="inline-flex cursor-pointer items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10">
            Choose sample PDF
          </label>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <GlassButton type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : book ? "Update book" : "Create draft"}
        </GlassButton>
        <p className="text-center text-xs text-zinc-600">Your listing stays private until you submit it and it is approved by BookQuest.</p>
      </form>
    </GlassPanel>
  );
}
