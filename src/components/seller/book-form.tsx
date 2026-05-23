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
    categoryId: string | null;
    coverUrl: string;
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

    const res = await fetch(url, { method, body: fd });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      setLoading(false);
      return;
    }
    window.location.href = "/seller";
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
          <label className="mb-1 block text-sm text-zinc-400">
            Cover image{book ? " (leave empty to keep current)" : ""}
          </label>
          <input
            name="cover"
            type="file"
            accept="image/*"
            required={!book}
            className="text-sm text-zinc-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            PDF file{book ? " (leave empty to keep current)" : ""}
          </label>
          <input
            name="pdf"
            type="file"
            accept="application/pdf"
            required={!book}
            className="text-sm text-zinc-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Sample PDF (optional)</label>
          <input name="sample" type="file" accept="application/pdf" className="text-sm text-zinc-400" />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <GlassButton type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : book ? "Update book" : "Create draft"}
        </GlassButton>
      </form>
    </GlassPanel>
  );
}
