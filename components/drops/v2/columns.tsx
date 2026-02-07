"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  FileIcon,
  ImageIcon,
  FileText,
  Code,
  Download,
  Trash,
  Edit,
  Pin,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

// Define the shape of our data (ItemResponse from API)
export type FileItem = {
  id: string;
  title: string;
  type: "file" | "folder" | "link" | "note" | "image" | "archive";
  size: number;
  createdAt: string;
  url?: string;
  pinned?: boolean;
};

function getFileIcon(type: string, name: string) {
  if (type === "image") return <ImageIcon className="h-8 w-8 text-blue-500" />;
  if (type === "note") return <FileText className="h-8 w-8 text-yellow-500" />;
  if (type === "link") return <LinkIcon className="h-8 w-8 text-purple-500" />;
  // Fallback based on extension
  if (name.endsWith(".pdf"))
    return <FileText className="h-8 w-8 text-red-500" />;
  if (name.endsWith(".zip") || name.endsWith(".rar"))
    return <FileText className="h-8 w-8 text-orange-500" />;
  return <FileIcon className="h-8 w-8 text-gray-400" />;
}

export const columns: ColumnDef<FileItem>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: "Name",
    cell: ({ row }) => {
      const item = row.original;

      return (
        <div className="flex items-center gap-3 py-1">
          <div className="flex items-center justify-center p-2 bg-muted/30 rounded-lg">
            {getFileIcon(item.type, item.title)}
          </div>
          <div className="flex flex-col min-w-[200px]">
            <span
              className="font-medium truncate max-w-[300px]"
              title={item.title}
            >
              {item.title}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {item.type}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "size",
    header: "Size",
    cell: ({ row }) => {
      const size = row.getValue("size") as number;
      return (
        <div className="text-muted-foreground font-mono text-xs">
          {size ? formatBytes(size) : "-"}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date Added",
    cell: ({ row }) => {
      return (
        <div className="text-muted-foreground text-xs whitespace-nowrap">
          {formatDistanceToNow(new Date(row.getValue("createdAt")), {
            addSuffix: true,
          })}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const item = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(item.url || "")}
            >
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {item.url && (
              <DropdownMenuItem asChild>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <Download className="mr-2 h-4 w-4" /> Download
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Pin className="mr-2 h-4 w-4" /> {item.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>

            {item.type === "link" && (
              <DropdownMenuItem asChild>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Open URL
                </a>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
