"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { GlassPanel, GlassInput } from "@/components/ui/glass";
import { Search } from "lucide-react";
import { FormEvent } from "react";

export function BooksFilters({
  categories,
  current,
}: {
  categories: { slug: string; name: string }[];
  current: { search?: string; category?: string; sort?: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/books?${params.toString()}`);
  }

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    update("search", (fd.get("search") as string) ?? "");
  }

  return (
    <GlassPanel className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
      <form onSubmit={onSearch} className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <GlassInput
          name="search"
          defaultValue={current.search ?? ""}
          placeholder="Search titles..."
          className="pl-10"
        />
      </form>
      <select
        value={current.category ?? ""}
        onChange={(e) => update("category", e.target.value)}
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={current.sort ?? ""}
        onChange={(e) => update("sort", e.target.value)}
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200"
      >
        <option value="">Newest</option>
        <option value="popular">Popular</option>
        <option value="rating">Top rated</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </select>
    </GlassPanel>
  );
}
