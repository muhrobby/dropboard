"use client";

import { useState } from "react";
import { SearchBar } from "@/components/search/search-bar";
import { SearchResults } from "@/components/search/search-results";
import { useSearch } from "@/hooks/use-search";
import { PageHeader } from "@/components/patterns";
import { Card, CardContent } from "@/components/ui/card";
import { Search, FileText, Link2, Image, Lightbulb } from "lucide-react";
import type { ItemType } from "@/types";

const searchTips = [
  { icon: FileText, text: "Search notes by title or content" },
  { icon: Link2, text: "Find saved links by URL or title" },
  { icon: Image, text: "Search files by filename" },
  { icon: Lightbulb, text: "Use tags to filter results" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ItemType | undefined>();
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSearch({
    q: query,
    type: typeFilter,
    tags: tagsFilter.length > 0 ? tagsFilter : undefined,
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

  function handleTagsFilterChange(tags: string[]) {
    setTagsFilter(tags);
    setPage(1);
  }

  const showTips = !query && !isLoading && (!data?.data || data.data.length === 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="p-4 md:p-6 space-y-4">
          <PageHeader
            title="Search"
            description="Find notes, links, and files across your workspace"
          />
          <SearchBar
            query={query}
            onQueryChange={handleQueryChange}
            typeFilter={typeFilter}
            onTypeFilterChange={handleTypeFilterChange}
            tagsFilter={tagsFilter}
            onTagsFilterChange={handleTagsFilterChange}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {showTips ? (
          <div className="max-w-2xl mx-auto">
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <Search className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Start searching</h3>
                  <p className="text-muted-foreground text-sm">
                    Type in the search bar above to find your content
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {searchTips.map((tip, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 transition-colors hover:bg-muted"
                    >
                      <tip.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground">{tip.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <SearchResults
            results={data?.data ?? []}
            meta={data?.meta ?? { page: 1, limit: 20, total: 0 }}
            isLoading={isLoading}
            query={query}
            page={page}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}

