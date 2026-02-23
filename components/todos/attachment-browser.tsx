"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, FileText, Link as LinkIcon, StickyNote, Image as ImageIcon } from "lucide-react";
import { useItems } from "@/hooks/use-items";
import { ItemResponse } from "@/types/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface AttachmentBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttach: (selectedItems: ItemResponse[]) => void;
  existingAttachmentIds: string[];
}

export function AttachmentBrowser({ open, onOpenChange, onAttach, existingAttachmentIds }: AttachmentBrowserProps) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useItems({ limit: 50 }); // Fetch recent items
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const items = data?.data || [];
  
  const filteredItems = items.filter(item => 
    item.title?.toLowerCase().includes(search.toLowerCase()) || 
    item.note?.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (item: ItemResponse) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id);
    } else {
      newSelected.add(item.id);
    }
    setSelectedIds(newSelected);
  };

  const handleAttach = () => {
    const selectedItems = items.filter(item => selectedIds.has(item.id));
    onAttach(selectedItems);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  const getItemIcon = (type: string, mimeType?: string) => {
    if (type === "link") return <LinkIcon className="h-4 w-4" />;
    if (type === "note") return <StickyNote className="h-4 w-4" />;
    if (type === "drop" && mimeType?.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Browse Workspace Files</DialogTitle>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search files, links, notes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[300px] mt-2 border rounded-md p-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="h-8 w-8 mb-2 opacity-50" />
              <p>No items found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map(item => {
                const isExisting = existingAttachmentIds.includes(item.id);
                const isSelected = selectedIds.has(item.id);
                
                return (
                  <div 
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer",
                      isExisting ? "opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      isSelected && "bg-primary/5 dark:bg-primary/10"
                    )}
                    onClick={() => {
                      if (!isExisting) handleToggle(item);
                    }}
                  >
                    <Checkbox 
                      checked={isSelected || isExisting} 
                      disabled={isExisting}
                      className="pointer-events-none"
                    />
                    <div className="h-8 w-8 rounded flex items-center justify-center bg-zinc-200/50 dark:bg-zinc-800 shrink-0 text-muted-foreground">
                      {getItemIcon(item.type, item.fileAsset?.mimeType ?? undefined)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate capitalize">{item.type}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAttach} disabled={selectedIds.size === 0}>
            Attach {selectedIds.size > 0 && `(${selectedIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}