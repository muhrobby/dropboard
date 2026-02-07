"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ItemType } from "@/types";

type SearchBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  typeFilter?: ItemType;
  onTypeFilterChange: (type: ItemType | undefined) => void;
};

export function SearchBar({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
}: SearchBarProps) {
  return (
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
        onValueChange={(v) => onTypeFilterChange(v === "all" ? undefined : (v as ItemType))}
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
    </div>
  );
}
