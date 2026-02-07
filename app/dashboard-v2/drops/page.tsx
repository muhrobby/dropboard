"use client";

import { useItems } from "@/hooks/use-items";
import { DataTable } from "@/components/drops/v2/data-table";
import { columns, FileItem } from "@/components/drops/v2/columns";
import { FilterSidebar } from "@/components/drops/v2/filters";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function DropsPageV2() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") as any;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const { data: itemsData, isLoading } = useItems({
    type: type === "all" ? undefined : type,
    page,
    limit,
  });

  // Transform data to match table columns
  const tableData: FileItem[] =
    itemsData?.data.map((item) => ({
      id: item.id,
      title: item.title,
      // Cast type to union or fallback
      type: item.type as FileItem["type"],
      size: item.size || 0,
      createdAt: item.createdAt,
      url: item.url || undefined,
      pinned: item.pinned || false,
    })) || [];

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">File Manager</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your files, folders, and shared content.
          </p>
        </div>
        <div>
          {/* New Upload Button (Primary Action) */}
          <Button size="sm" asChild>
            <Link href="/dashboard-v2/drops/upload?type=file">
              <Plus className="mr-2 h-4 w-4" /> New Upload
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 md:grid md:grid-cols-[200px_1fr]">
        {/* Sidebar (Filters) */}
        <aside className="hidden w-[200px] flex-col md:flex">
          <FilterSidebar />
        </aside>

        {/* Main Content (Table) */}
        <main className="w-full flex-1 overflow-hidden">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-[200px]" />
                <Skeleton className="h-10 w-[100px]" />
              </div>
              <div className="rounded-md border">
                <div className="p-4 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-3 w-[150px]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={tableData}
              filterColumn="title"
              filterPlaceholder="Search files..."
            />
          )}
        </main>
      </div>
    </div>
  );
}
