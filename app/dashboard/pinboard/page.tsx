"use client";

import { useState, useMemo } from "react";
import {
  Bookmark,
  Link as LinkIcon,
  StickyNote,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { AddLinkForm } from "@/components/pinboard/add-link-form";
import { AddNoteForm } from "@/components/pinboard/add-note-form";
import { LinkCard } from "@/components/pinboard/link-card";
import { NoteCard } from "@/components/pinboard/note-card";
import { useItems } from "@/hooks/use-items";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/patterns";

type ActiveTab = "links" | "notes";

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  bgColor: string;
}) {
  const Icon = icon;
  return (
    <Card className="relative overflow-hidden group border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 hover:border-primary/30">
      <div className="flex items-start gap-4 relative z-10">
        <div className={cn("flex items-center justify-center size-12 rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-sm", bgColor)}>
          <Icon className={cn("size-6", color)} />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums leading-none">{value}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{subtext}</p>
          )}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Card>
  );
}

export default function PinboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("links");
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);

  const { data: linksData, isLoading: linksLoading } = useItems({
    type: "link",
  });
  const { data: notesData, isLoading: notesLoading } = useItems({
    type: "note",
  });

  const links = linksData?.data ?? [];
  const notes = notesData?.data ?? [];

  // Calculate statistics
  const stats = useMemo(() => {
    const totalLinks = links.length;
    const totalNotes = notes.length;
    const totalPins = totalLinks + totalNotes;

    // Count tagged items
    const taggedLinks = links.filter((item) => item.tags && item.tags.length > 0).length;
    const taggedNotes = notes.filter((item) => item.tags && item.tags.length > 0).length;

    // Count items with notes
    const linksWithNotes = links.filter((item) => item.note).length;
    const notesWithContent = notes.filter((item) => item.content && item.content.length > 0).length;

    return {
      totalLinks,
      totalNotes,
      totalPins,
      taggedLinks,
      taggedNotes,
      linksWithNotes,
      notesWithContent,
    };
  }, [links, notes]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="p-4 md:p-6 lg:px-8 space-y-5 max-w-7xl mx-auto w-full">
          <PageHeader
            title="Pinboard"
            description="Save important links and quick notes permanently."
          >
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsAddLinkModalOpen(true)} variant="outline" className="rounded-xl shadow-sm hover:shadow-md transition-all group border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 px-3 sm:px-4">
                <LinkIcon className="size-4 sm:mr-2 transition-transform group-hover:rotate-12" />
                <span className="hidden sm:inline">Add Link</span>
              </Button>
              <Button onClick={() => setIsAddNoteModalOpen(true)} className="rounded-xl shadow-sm hover:shadow-md transition-all group px-3 sm:px-4">
                <StickyNote className="size-4 sm:mr-2 transition-transform group-hover:scale-110" />
                <span className="hidden sm:inline">Add Note</span>
              </Button>
            </div>
          </PageHeader>

          {/* Custom Tabs List inside Header */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as ActiveTab)}
            className="w-full sm:w-auto"
          >
            <TabsList className="h-10 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-full grid grid-cols-2 sm:flex sm:w-fit">
              <TabsTrigger value="links" className="rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm gap-2 px-6">
                <LinkIcon className="size-4" />
                Links
                {links.length > 0 && (
                  <span className="text-[11px] text-muted-foreground bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-md">
                    {links.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm gap-2 px-6">
                <StickyNote className="size-4" />
                Notes
                {notes.length > 0 && (
                  <span className="text-[11px] text-muted-foreground bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-md">
                    {notes.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-zinc-50/50 dark:bg-zinc-950/50 scroll-smooth">
        <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
          {/* Stat Cards */}
          {!linksLoading && !notesLoading && stats.totalPins > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 animate-in slide-in-from-bottom-4 duration-500">
              <StatCard
                icon={LinkIcon}
                label="Total Links"
                value={stats.totalLinks}
                subtext={`${stats.taggedLinks} tagged`}
                color="text-pink-600 dark:text-pink-400"
                bgColor="bg-pink-500/10"
              />
              <StatCard
                icon={StickyNote}
                label="Total Notes"
                value={stats.totalNotes}
                subtext={`${stats.taggedNotes} tagged`}
                color="text-amber-600 dark:text-amber-400"
                bgColor="bg-amber-500/10"
              />
              <StatCard
                icon={Bookmark}
                label="Total Pins"
                value={stats.totalPins}
                subtext="All saved items"
                color="text-indigo-600 dark:text-indigo-400"
                bgColor="bg-indigo-500/10"
              />
              <StatCard
                icon={Plus}
                label="With Details"
                value={stats.linksWithNotes + stats.notesWithContent}
                subtext="Items with descriptions"
                color="text-emerald-600 dark:text-emerald-400"
                bgColor="bg-emerald-500/10"
              />
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as ActiveTab)}
            className="w-full"
          >
            {/* Hidden tabs list for compatibility, visual list moved to header */}
            <TabsList className="hidden">
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

          {/* Links Tab */}
          <TabsContent value="links" className="space-y-6 outline-none pt-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-500">
            {/* Quick add link dummy input */}
            <div 
              onClick={() => setIsAddLinkModalOpen(true)}
              className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 p-2 cursor-text hover:border-primary/30 hover:shadow-md transition-all duration-300 flex items-center gap-3 text-muted-foreground group"
            >
              <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <LinkIcon className="size-4" />
              </div>
              <span className="text-sm font-medium">Paste a URL to save a new link...</span>
            </div>

            {/* Loading state */}
            {linksLoading && (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!linksLoading && links.length === 0 && (
              <EmptyState
                icon={LinkIcon}
                title="No links saved"
                description="Click 'Add Link' above or paste a URL to save your first link."
              />
            )}

            {/* Link list */}
            {!linksLoading && links.length > 0 && (
              <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
                {links.map((item) => (
                  <div key={item.id} className="transition-all duration-300 hover:-translate-x-1 hover:shadow-md rounded-2xl">
                    <LinkCard item={item} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4 outline-none pt-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-500">
            {/* Add note toggle */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground h-14 rounded-2xl border-dashed border-2 border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-300 group shadow-sm px-6"
              onClick={() => setIsAddNoteModalOpen(true)}
            >
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Plus className="size-4" />
              </div>
              <span className="font-medium">Write a new note...</span>
            </Button>

            {/* Loading state */}
            {notesLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!notesLoading && notes.length === 0 && (
              <EmptyState
                icon={StickyNote}
                title="No notes yet"
                description="Click 'Add Note' to create your first note."
              />
            )}

            {/* Note grid */}
            {!notesLoading && notes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
                {notes.map((item) => (
                  <div key={item.id} className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg rounded-2xl">
                    <NoteCard item={item} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Modals */}
      <Dialog open={isAddLinkModalOpen} onOpenChange={setIsAddLinkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Link</DialogTitle>
            <DialogDescription>
              Save a URL with optional title, note, and tags.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <AddLinkForm
              onSuccess={() => setIsAddLinkModalOpen(false)}
              onCancel={() => setIsAddLinkModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddNoteModalOpen} onOpenChange={setIsAddNoteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Write a Note</DialogTitle>
            <DialogDescription>
              Create a quick note. You can optionally password-protect it.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <AddNoteForm
              onSuccess={() => setIsAddNoteModalOpen(false)}
              onCancel={() => setIsAddNoteModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
