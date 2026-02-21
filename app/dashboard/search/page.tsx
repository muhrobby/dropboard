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
      <div className="border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="p-4 md:p-6 lg:px-8 space-y-6 max-w-7xl mx-auto w-full">
          <PageHeader
            title="Search"
            description="Find notes, links, and files across your entire workspace instantly."
          />
          <div className="relative z-30">
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-zinc-50/50 dark:bg-zinc-950/50 scroll-smooth">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {showTips ? (
            <div className="max-w-2xl mx-auto mt-8 sm:mt-16 animate-in fade-in zoom-in-95 duration-500">
              <Card className="border-2 border-dashed border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm shadow-none">
                <CardContent className="pt-10 pb-8 px-6 sm:px-10">
                  <div className="text-center mb-10 relative">
                    <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 text-primary mb-6 shadow-sm ring-1 ring-primary/20">
                      <Search className="size-8" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-foreground mb-3">What are you looking for?</h3>
                    <p className="text-base text-muted-foreground/80 leading-relaxed max-w-sm mx-auto">
                      Type in the search bar above to instantly find any file, note, or link in your workspace.
                    </p>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {searchTips.map((tip, index) => (
                      <div
                        key={index}
                        className="group flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30"
                      >
                        <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <tip.icon className="size-4.5" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{tip.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SearchResults
                results={data?.data ?? []}
                meta={data?.meta ?? { page: 1, limit: 20, total: 0 }}
                isLoading={isLoading}
                query={query}
                page={page}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

