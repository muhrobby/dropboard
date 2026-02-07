"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  FileIcon,
  ImageIcon,
  FileText,
  Code,
  MoreHorizontal,
  Download,
} from "lucide-react";
import { useItems } from "@/hooks/use-items";
import { formatBytes } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function getFileIcon(type: string, name: string) {
  if (type === "image") return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (type === "note") return <FileText className="h-4 w-4 text-yellow-500" />;
  if (type === "link") return <Code className="h-4 w-4 text-purple-500" />;
  // Fallback based on extension
  if (name.endsWith(".pdf"))
    return <FileText className="h-4 w-4 text-red-500" />;
  return <FileIcon className="h-4 w-4 text-gray-500" />;
}

export function RecentUploads() {
  const { data: itemsData, isLoading } = useItems({ limit: 10 }); // Fetch slightly more to sort

  // Client-side sort and slice
  const recentItems = itemsData?.data
    ?.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card className="col-span-full lg:col-span-4 h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="space-y-2 flex-1 relative">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full lg:col-span-4 h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Recent Uploads</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard-v2/drops">View All</Link>
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        <div className="space-y-0">
          {recentItems && recentItems.length > 0 ? (
            recentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                    {getFileIcon(item.type, item.title)}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground truncate max-w-[150px] sm:max-w-[200px]">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>
                        {item.size ? formatBytes(item.size) : "No size"}
                      </span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Actions */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Share</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No files uploaded yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
