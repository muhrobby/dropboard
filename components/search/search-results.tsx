"use client";

import { Search } from "lucide-react";
import { DropCard } from "@/components/drops/drop-card";
import { LinkCard } from "@/components/pinboard/link-card";
import { NoteCard } from "@/components/pinboard/note-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { ItemResponse, PaginationMeta } from "@/types/api";

type SearchResultsProps = {
  results: ItemResponse[];
  meta: PaginationMeta;
  isLoading: boolean;
  query: string;
  page: number;
  onPageChange: (page: number) => void;
};

function ResultCard({ item }: { item: ItemResponse }) {
  switch (item.type) {
    case "drop":
      return <DropCard item={item} />;
    case "link":
      return <LinkCard item={item} />;
    case "note":
      return <NoteCard item={item} />;
    default:
      return null;
  }
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 px-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Search your workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Find files, links, and notes across your workspace. Search by title,
          content, or tags.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 px-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">No results found</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        No items matched &quot;{query}&quot;. Try a different search term.
      </p>
    </div>
  );
}

export function SearchResults({
  results,
  meta,
  isLoading,
  query,
  page,
  onPageChange,
}: SearchResultsProps) {
  if (isLoading && results.length === 0) {
    return <ResultsSkeleton />;
  }

  if (results.length === 0) {
    return <EmptyState query={query} />;
  }

  const totalPages = Math.ceil(meta.total / meta.limit);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {meta.total} result{meta.total !== 1 ? "s" : ""} for &quot;{query}&quot;
      </p>

      {/* Results grid - drops get grid layout, links/notes get list layout */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((item) => (
          <ResultCard key={item.id} item={item} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
