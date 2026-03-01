"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TagEditorProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
};

export function TagEditor({
  tags,
  onChange,
  maxTags = 10,
  disabled = false,
  className,
}: TagEditorProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const value = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!value) return;
    if (tags.includes(value)) return;
    if (tags.length >= maxTags) return;
    onChange([...tags, value]);
    setInputValue("");
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 min-h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 cursor-text",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <Badge
          key={tag}
          variant="secondary"
          className="gap-1 text-xs font-medium px-2 py-0.5 rounded-md"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              className="ml-0.5 hover:text-destructive transition-colors"
            >
              <X className="size-2.5" />
            </button>
          )}
        </Badge>
      ))}

      {tags.length < maxTags && !disabled && (
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(inputValue)}
          placeholder={tags.length === 0 ? "Add tags..." : ""}
          className="h-auto border-0 p-0 shadow-none focus-visible:ring-0 text-xs min-w-20 flex-1 bg-transparent"
        />
      )}
    </div>
  );
}
