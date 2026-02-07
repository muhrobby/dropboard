"use client";

import { PinGrid } from "@/components/pinboard/v2/pin-grid";
import { useItems } from "@/hooks/use-items";
import { FileItem } from "@/components/drops/v2/columns";
import { Skeleton } from "@/components/ui/skeleton";

export default function PinboardPageV2() {
  const { data: itemsData, isLoading } = useItems({
    pinned: true,
    page: 1, // TODO: Implement pagination or infinite scroll for Pinboard
    limit: 50, // Initial high limit
  });

  // Transform data
  const pinnedItems: FileItem[] =
    itemsData?.data.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type as FileItem["type"],
      size: item.size || 0,
      createdAt: item.createdAt,
      url: item.url || undefined,
      pinned: item.pinned || false,
    })) || [];

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pinboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Quick access to your most important files.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1">
        {isLoading ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="break-inside-avoid mb-4 border rounded-lg overflow-hidden"
              >
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-[80%]" />
                  <Skeleton className="h-3 w-[40%]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <PinGrid items={pinnedItems} />
        )}
      </div>
    </div>
  );
}
