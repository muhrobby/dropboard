"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Link as LinkIcon,
  StickyNote,
  ExternalLink,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PublicBoardResponse, PublicBoardItem } from "@/types/api";

type Props = {
  board: PublicBoardResponse;
};

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function LinkItemCard({ item }: { item: PublicBoardItem }) {
  const [imgError, setImgError] = useState(false);
  const ogImage = !imgError ? (item.linkMetadata?.ogImage ?? null) : null;
  const favicon = item.linkMetadata?.faviconUrl ?? null;
  const ogDescription = item.linkMetadata?.ogDescription ?? null;
  const url = item.content ?? "";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200"
    >
      {ogImage && (
        <div className="relative h-36 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ogImage}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        </div>
      )}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 overflow-hidden mt-0.5">
            {favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={favicon} alt="" className="h-4 w-4 object-contain" loading="lazy" />
            ) : (
              <LinkIcon className="h-3.5 w-3.5 text-indigo-500/70" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug line-clamp-2">{item.title}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{getDomain(url)}</p>
          </div>
          <ExternalLink className="size-3.5 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors mt-0.5" />
        </div>
        {ogDescription && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{ogDescription}</p>
        )}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

function NoteItemCard({ item }: { item: PublicBoardItem }) {
  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-amber-50/60 dark:bg-amber-950/20 shadow-sm p-4 gap-3">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md shrink-0">
          <StickyNote className="size-4" />
        </div>
        <p className="text-sm font-semibold truncate leading-none">{item.title}</p>
      </div>
      {item.content && (
        <div
          className="text-sm text-muted-foreground leading-relaxed line-clamp-4
            [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4
            [&_strong]:font-semibold [&_em]:italic [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:text-[0.85em]"
          dangerouslySetInnerHTML={{ __html: item.content }}
        />
      )}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto pt-1">
          {item.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublicBoardClient({ board }: Props) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Collect all unique tags from the board
  const allTags = useMemo(() => {
    const set = new Set<string>();
    board.items.forEach((item) => item.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [board.items]);

  const filtered = useMemo(() => {
    return board.items.filter((item) => {
      const q = query.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.content?.toLowerCase().includes(q) ?? false) ||
        (item.note?.toLowerCase().includes(q) ?? false);
      const matchesTag = !activeTag || item.tags.includes(activeTag);
      return matchesQuery && matchesTag;
    });
  }, [board.items, query, activeTag]);

  const linkCount = filtered.filter((i) => i.type === "link").length;
  const noteCount = filtered.filter((i) => i.type === "note").length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Hero header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Tag className="size-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {board.collection.name}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            {board.items.length} item{board.items.length !== 1 ? "s" : ""} — shared publicly
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items…"
              className="pl-9 h-9 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-all",
                    activeTag === tag
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-muted-foreground hover:border-indigo-400 dark:hover:border-indigo-500",
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No items match your search.</p>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
              {linkCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <LinkIcon className="size-3.5 text-indigo-500" />
                  {linkCount} link{linkCount !== 1 ? "s" : ""}
                </span>
              )}
              {noteCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <StickyNote className="size-3.5 text-amber-500" />
                  {noteCount} note{noteCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Masonry-style grid */}
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-0">
              {filtered.map((item) => (
                <div key={item.id} className="break-inside-avoid mb-4">
                  {item.type === "link" ? (
                    <LinkItemCard item={item} />
                  ) : (
                    <NoteItemCard item={item} />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <Link
              href="/"
              className="font-semibold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Dropboard
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
