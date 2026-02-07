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
import { EmptyState } from "@/components/shared/empty-state";
import { AddLinkForm } from "@/components/pinboard/add-link-form";
import { AddNoteForm } from "@/components/pinboard/add-note-form";
import { LinkCard } from "@/components/pinboard/link-card";
import { NoteCard } from "@/components/pinboard/note-card";
import { useItems } from "@/hooks/use-items";
import { cn } from "@/lib/utils";

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
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={cn("flex items-center justify-center w-12 h-12 rounded-xl", bgColor)}>
          <Icon className={cn("w-6 h-6", color)} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function PinboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("links");
  const [showAddNote, setShowAddNote] = useState(false);

  const { data: linksData, isLoading: linksLoading } = useItems({
    type: "link",
  });
  const { data: notesData, isLoading: notesLoading } = useItems({
    type: "note",
  });

  const links = linksData?.data ?? [];
  const notes = notesData?.data ?? [];
  const isLoading = activeTab === "links" ? linksLoading : notesLoading;

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
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pinboard</h1>
      </div>

      {/* Stat Cards */}
      {!linksLoading && !notesLoading && stats.totalPins > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-2">
          <StatCard
            icon={LinkIcon}
            label="Total Links"
            value={stats.totalLinks}
            subtext={`${stats.taggedLinks} tagged`}
            color="text-pink-500"
            bgColor="bg-pink-500/10"
          />
          <StatCard
            icon={StickyNote}
            label="Total Notes"
            value={stats.totalNotes}
            subtext={`${stats.taggedNotes} tagged`}
            color="text-yellow-500"
            bgColor="bg-yellow-500/10"
          />
          <StatCard
            icon={Bookmark}
            label="Total Pins"
            value={stats.totalPins}
            subtext="All saved items"
            color="text-indigo-500"
            bgColor="bg-indigo-500/10"
          />
          <StatCard
            icon={Plus}
            label="With Notes"
            value={stats.linksWithNotes + stats.notesWithContent}
            subtext="Items with descriptions"
            color="text-green-500"
            bgColor="bg-green-500/10"
          />
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ActiveTab)}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="links" className="gap-1.5">
            <LinkIcon className="h-3.5 w-3.5" />
            Links
            {links.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({links.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <StickyNote className="h-3.5 w-3.5" />
            Notes
            {notes.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({notes.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Links Tab */}
        <TabsContent value="links" className="space-y-4">
          {/* Quick add link bar */}
          <AddLinkForm />

          {/* Loading state */}
          {linksLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!linksLoading && links.length === 0 && (
            <EmptyState
              icon={LinkIcon}
              title="No links saved"
              description="Paste a URL above to save your first link. All links are permanent."
            />
          )}

          {/* Link list */}
          {!linksLoading && links.length > 0 && (
            <div className="space-y-2">
              {links.map((item) => (
                <LinkCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          {/* Add note toggle */}
          {!showAddNote ? (
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => setShowAddNote(true)}
            >
              <Plus className="h-4 w-4" />
              New note
            </Button>
          ) : (
            <AddNoteForm onSuccess={() => setShowAddNote(false)} />
          )}

          {/* Loading state */}
          {notesLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!notesLoading && notes.length === 0 && (
            <EmptyState
              icon={StickyNote}
              title="No notes yet"
              description="Create your first note. All notes are permanent and won't expire."
            />
          )}

          {/* Note grid */}
          {!notesLoading && notes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {notes.map((item) => (
                <NoteCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
