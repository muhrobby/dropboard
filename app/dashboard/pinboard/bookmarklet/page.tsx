"use client";

import { useState, useMemo } from "react";
import {
  Bookmark,
  Copy,
  Check,
  Info,
  Chrome,
  Globe,
  ExternalLink,
  MousePointer2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// The bookmarklet source — minified JS that:
//  1. Grabs current page URL + title
//  2. Detects any selected text
//  3. Opens a small popup window that POSTs to /share-target (same-origin)
// ---------------------------------------------------------------------------
function buildBookmarkletCode(appUrl: string): string {
  const code = `(function(){
var u=encodeURIComponent(location.href);
var t=encodeURIComponent(document.title);
var sel=window.getSelection?window.getSelection().toString():'';
var tx=encodeURIComponent(sel||'');
var w=window.open('${appUrl}/share-target?url='+u+'&title='+t+'&text='+tx,'_dropboard','width=480,height=620,top=100,left=100,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');
if(w)w.focus();
})();`;
  return "javascript:" + code;
}

export default function BookmarkletPage() {
  const [copied, setCopied] = useState(false);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://app.dropboard.io";

  const bookmarkletHref = useMemo(() => buildBookmarkletCode(appUrl), [appUrl]);

  function handleCopyCode() {
    navigator.clipboard.writeText(bookmarkletHref);
    setCopied(true);
    toast.success("Bookmarklet code copied");
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Bookmark className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bookmarklet</h1>
            <p className="text-sm text-muted-foreground">
              Save any page to Dropboard with a single click — no extension required.
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Globe className="h-3 w-3" />
          Works in any browser
        </Badge>
      </div>

      {/* The drag target */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center gap-5 py-10">
          <p className="text-sm text-center text-muted-foreground max-w-sm">
            Drag the button below to your bookmarks bar, or click <strong>Copy code</strong> and add it manually.
          </p>

          {/* eslint-disable-next-line react/jsx-no-script-url */}
          <a
            href={bookmarkletHref}
            onClick={(e) => {
              e.preventDefault();
              toast.info("Drag this button to your bookmarks bar to install it.");
            }}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all cursor-grab active:cursor-grabbing select-none"
            draggable
          >
            <Bookmark className="h-4 w-4" />
            Save to Dropboard
          </a>

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MousePointer2 className="h-3 w-3" />
            Drag the button above onto your bookmarks bar
          </p>

          <div className="w-full max-w-sm pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Or copy the code and paste into a new bookmark manually:
            </p>
            <div className="relative">
              <div className="rounded-lg bg-muted px-4 py-3 pr-12 font-mono text-[11px] break-all text-muted-foreground select-all">
                {bookmarkletHref.slice(0, 80)}…
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-7 w-7"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          Installation instructions
        </h2>

        <div className="grid gap-4">
          {/* Chrome / Edge */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Chrome className="h-4 w-4 text-blue-500" />
                Chrome / Edge / Brave
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1.5">
              <ol className="list-decimal list-inside space-y-1">
                <li>Show the bookmarks bar: <kbd className="bg-muted rounded px-1 py-0.5 text-xs font-mono">Ctrl+Shift+B</kbd></li>
                <li>Drag the <strong>Save to Dropboard</strong> button above onto the bar</li>
                <li>
                  <span className="text-foreground font-medium">Done!</span> Visit any page and click the bookmark to save it.
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Firefox */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-orange-500" />
                Firefox
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1.5">
              <ol className="list-decimal list-inside space-y-1">
                <li>Show the bookmarks toolbar: <kbd className="bg-muted rounded px-1 py-0.5 text-xs font-mono">Ctrl+Shift+B</kbd></li>
                <li>Drag the <strong>Save to Dropboard</strong> button above onto the toolbar</li>
                <li>
                  <span className="text-foreground font-medium">Done!</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Safari / Mobile */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-sky-500" />
                Safari / Mobile browsers
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1.5">
              <ol className="list-decimal list-inside space-y-1">
                <li>Click <strong>Copy code</strong> above to copy the bookmarklet JavaScript</li>
                <li>Bookmark any page in Safari (e.g., bookmark this page)</li>
                <li>Edit the bookmark, clear the URL field, and paste the copied code</li>
                <li>Save — the bookmark is now a working bookmarklet</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How it works */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">How it works</CardTitle>
          <CardDescription className="text-xs">
            When you click the bookmarklet on any webpage:
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-primary font-semibold shrink-0">1.</span>
              The current page URL and title are captured automatically.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-semibold shrink-0">2.</span>
              Any <strong>highlighted text</strong> on the page is captured as the note (Highlight Sync).
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-semibold shrink-0">3.</span>
              A small popup opens where you can review and edit before saving.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-semibold shrink-0">4.</span>
              The link is saved to your active workspace on Dropboard.
            </li>
          </ul>
          <p className="text-xs pt-2 flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Info className="h-3 w-3 shrink-0" />
            You must be logged in to Dropboard in the same browser for the bookmarklet to work.
          </p>
        </CardContent>
      </Card>

      {/* Extension CTA */}
      <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-5 py-4">
        <div>
          <p className="text-sm font-semibold">Want more features?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            The browser extension supports richer capture without needing to be on the same domain.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
          <a href="/dashboard/pinboard/extension">
            <ExternalLink className="h-3.5 w-3.5" />
            Extension
          </a>
        </Button>
      </div>
    </div>
  );
}
