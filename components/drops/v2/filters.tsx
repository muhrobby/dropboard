"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Folder,
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  Archive,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const filters = [
  { id: "all", label: "All Files", icon: Folder },
  { id: "image", label: "Images", icon: ImageIcon },
  { id: "document", label: "Documents", icon: FileText },
  { id: "video", label: "Videos", icon: Video },
  { id: "audio", label: "Audio", icon: Music },
  { id: "archive", label: "Archives", icon: Archive },
  { id: "other", label: "Others", icon: Code },
];

export function FilterSidebar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentType = searchParams.get("type") || "all";

  const handleFilter = (type: string) => {
    const params = new URLSearchParams(searchParams);
    if (type === "all") {
      params.delete("type");
    } else {
      params.set("type", type);
    }
    // Reset page on filter change
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4 py-4">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Library
        </h2>
        <div className="space-y-1">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={currentType === filter.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                currentType === filter.id && "bg-secondary",
              )}
              onClick={() => handleFilter(filter.id)}
            >
              <filter.icon className="h-4 w-4" />
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* TODO: Tags Section */}
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Tags</h2>
        <div className="px-4 text-sm text-muted-foreground">
          No tags created yet.
        </div>
      </div>
    </div>
  );
}
