"use client";

import { useState } from "react";
import { SearchBar } from "@/components/search/search-bar";
import { SearchResults } from "@/components/search/search-results";
import { useSearch } from "@/hooks/use-search";
import type { ItemType } from "@/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ItemType | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSearch({
    q: query,
    type: typeFilter,
    page,
    limit: 20,
  });

  function handleQueryChange(q: string) {
    setQuery(q);
    setPage(1);
  }

  function handleTypeFilterChange(type: ItemType | undefined) {
    setTypeFilter(type);
    setPage(1);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">Search</h1>
        <SearchBar
          query={query}
          onQueryChange={handleQueryChange}
          typeFilter={typeFilter}
          onTypeFilterChange={handleTypeFilterChange}
        />
      </div>

      <SearchResults
        results={data?.data ?? []}
        meta={data?.meta ?? { page: 1, limit: 20, total: 0 }}
        isLoading={isLoading}
        query={query}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}
