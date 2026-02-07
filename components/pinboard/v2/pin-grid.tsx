"use client";

import { FileItem } from "@/components/drops/v2/columns";
import { PinCard } from "@/components/pinboard/v2/pin-card";
import { useUnpinItem } from "@/hooks/use-items";
import { toast } from "sonner";

interface PinGridProps {
  items: FileItem[];
}

export function PinGrid({ items }: PinGridProps) {
  const { mutate: unpinItem } = useUnpinItem();

  const handleUnpin = (id: string) => {
    unpinItem(id, {
      onSuccess: () => {
        toast.success("Item unpinned");
      },
      onError: () => {
        toast.error("Failed to unpin item");
      },
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 border-2 border-dashed rounded-lg">
        <h3 className="text-lg font-semibold">No Pinned Items</h3>
        <p className="text-muted-foreground mt-1 max-w-sm">
          Pin important files and folders here for quick access. Go to "All
          Drops" and select "Pin" from the actions menu.
        </p>
      </div>
    );
  }

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
      {items.map((item) => (
        <PinCard key={item.id} item={item} onUnpin={handleUnpin} />
      ))}
    </div>
  );
}
