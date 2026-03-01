"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, AlertCircle, BookOpen } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ItemResponse } from "@/types/api";

type ReaderViewSheetProps = {
  item: ItemResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ReaderArticle = {
  itemId: string;
  url: string;
  title: string | null;
  content: string | null;
  excerpt: string | null;
  siteName: string | null;
  byline: string | null;
};

type ReaderState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; article: ReaderArticle }
  | { status: "error"; message: string };

export function ReaderViewSheet({
  item,
  open,
  onOpenChange,
}: ReaderViewSheetProps) {
  const [state, setState] = useState<ReaderState>({ status: "idle" });

  const url = item.content || "";

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    // Defer the loading state assignment to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      setState({ status: "loading" });
    }, 0);

    fetch(`/api/v1/items/${item.id}/read`, { signal: controller.signal })
      .then(async (res) => {
        clearTimeout(timer);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setState({
            status: "error",
            message:
              body?.error?.message ??
              "Failed to extract article content.",
          });
          return;
        }
        const body = await res.json();
        setState({ status: "success", article: body.data });
      })
      .catch((err) => {
        clearTimeout(timer);
        if (err.name === "AbortError") return;
        setState({
          status: "error",
          message: "Network error — could not load article.",
        });
      });

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, item.id]);

  function handleOpenOriginal() {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const articleTitle =
    state.status === "success" ? (state.article.title ?? item.title) : item.title;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 shrink-0 space-y-1">
          <div className="flex items-start gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold leading-snug line-clamp-2">
                {articleTitle}
              </SheetTitle>
              {state.status === "success" && state.article.byline && (
                <SheetDescription className="text-xs mt-0.5">
                  {state.article.byline}
                  {state.article.siteName && (
                    <> &middot; {state.article.siteName}</>
                  )}
                </SheetDescription>
              )}
              {state.status !== "success" && (
                <SheetDescription className="text-xs mt-0.5 truncate">
                  {url}
                </SheetDescription>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-fit text-xs"
            onClick={handleOpenOriginal}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Open Original
          </Button>
        </SheetHeader>

        <Separator />

        {/* Body */}
        <ScrollArea className="flex-1 px-6">
          <div className="py-6">
            {state.status === "loading" && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Extracting article…</p>
              </div>
            )}

            {state.status === "error" && (
              <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 text-destructive/60" />
                <p className="text-sm font-medium">Could not extract article</p>
                <p className="text-xs max-w-xs leading-relaxed">
                  {state.message}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleOpenOriginal}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open original page
                </Button>
              </div>
            )}

            {state.status === "success" && (
              <>
                {state.article.excerpt && (
                  <p className="text-sm text-muted-foreground italic mb-6 leading-relaxed border-l-2 border-muted pl-4">
                    {state.article.excerpt}
                  </p>
                )}
                {state.article.content ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none
                      prose-headings:font-semibold prose-headings:tracking-tight
                      prose-a:text-indigo-600 dark:prose-a:text-indigo-400
                      prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:text-[0.8em]
                      prose-pre:bg-muted prose-pre:rounded-lg
                      prose-img:rounded-lg prose-img:shadow-sm"
                    // The content comes from Readability which strips scripts/iframes;
                    // this is safer than arbitrary user HTML but still set via dangerouslySetInnerHTML.
                    dangerouslySetInnerHTML={{ __html: state.article.content }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No readable content found</p>
                    <p className="text-xs max-w-xs leading-relaxed">
                      This page may require JavaScript or login to display its
                      content.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleOpenOriginal}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open original page
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
