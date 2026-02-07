"use client";

import { useState } from "react";
import { Search, X, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ItemType } from "@/types";

type SearchBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  typeFilter?: ItemType;
  onTypeFilterChange: (type: ItemType | undefined) => void;
  tagsFilter: string[];
  onTagsFilterChange: (tags: string[]) => void;
};

export function SearchBar({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  tagsFilter,
  onTagsFilterChange,
}: SearchBarProps) {
  const [tagInput, setTagInput] = useState("");

  function addTag() {
    const value = tagInput.trim().toLowerCase();
    if (!value || tagsFilter.includes(value)) {
      setTagInput("");
      return;
    }
    onTagsFilterChange([...tagsFilter, value]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    onTagsFilterChange(tagsFilter.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search drops, links, and notes..."
            className="pl-10 pr-10"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            autoFocus
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onQueryChange("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <Select
          value={typeFilter ?? "all"}
          onValueChange={(v) =>
            onTypeFilterChange(v === "all" ? undefined : (v as ItemType))
          }
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="drop">Drops</SelectItem>
            <SelectItem value="link">Links</SelectItem>
            <SelectItem value="note">Notes</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <Tag className="h-4 w-4" />
              Tags
              {tagsFilter.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {tagsFilter.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <div className="text-sm font-medium">Filter by tags</div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="flex-1"
                />
                <Button size="sm" onClick={addTag} disabled={!tagInput.trim()}>
                  Add
                </Button>
              </div>
              {tagsFilter.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tagsFilter.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 text-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => onTagsFilterChange([])}
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {tagsFilter.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Filtering by:</span>
          <div className="flex flex-wrap gap-1">
            {tagsFilter.map((tag) => (
              <Badge key={tag} variant="outline" className="gap-1 text-xs">
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
