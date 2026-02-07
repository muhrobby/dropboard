"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
};

export function TagInput({
  tags,
  onChange,
  placeholder = "Add tag...",
  maxTags = 10,
}: TagInputProps) {
  const [input, setInput] = useState("");

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function addTag() {
    const value = input.trim().toLowerCase();
    if (!value) return;
    if (tags.includes(value)) {
      setInput("");
      return;
    }
    if (tags.length >= maxTags) return;
    onChange([...tags, value]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 text-xs">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {tag}</span>
          </button>
        </Badge>
      ))}
      {tags.length < maxTags && (
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="h-auto min-w-[80px] flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
        />
      )}
    </div>
  );
}
