"use client";

import { FileItem } from "@/components/drops/v2/columns";
import { formatBytes } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  MoreHorizontal,
  FileIcon,
  ImageIcon,
  FileText,
  Code,
  Download,
  Trash,
  Edit,
  PinOff,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio"; // Check if aspect-ratio needs install? Assuming yes or basic div
import Image from "next/image";

interface PinCardProps {
  item: FileItem;
  onUnpin: (id: string) => void;
}

function getFileIcon(type: string, name: string) {
  if (type === "image")
    return <ImageIcon className="h-12 w-12 text-blue-500" />;
  if (type === "note")
    return <FileText className="h-12 w-12 text-yellow-500" />;
  if (type === "link")
    return <LinkIcon className="h-12 w-12 text-purple-500" />;
  if (name.endsWith(".pdf"))
    return <FileText className="h-12 w-12 text-red-500" />;
  return <FileIcon className="h-12 w-12 text-gray-400" />;
}

export function PinCard({ item, onUnpin }: PinCardProps) {
  // Determine preview content
  const isImage = item.type === "image"; // In real app, check mimetype or extension too

  return (
    <Card className="break-inside-avoid mb-4 overflow-hidden group hover:shadow-lg transition-shadow">
      <CardContent className="p-0 relative">
        {/* Preview Area */}
        {isImage && item.url ? (
          <div className="relative aspect-video w-full bg-muted">
            {/* Note: In real app use Next.js Image with remote patterns configured. 
                   For now, simple img tag or fallback if domain not allowed */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.title}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] w-full bg-muted/20 flex items-center justify-center">
            {getFileIcon(item.type, item.title)}
          </div>
        )}

        {/* Hover Overlay Actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-full shadow-sm"
            onClick={() => onUnpin(item.id)}
            title="Unpin"
          >
            <PinOff className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      <CardFooter className="p-4 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium truncate" title={item.title}>
            {item.title}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <span>{item.size ? formatBytes(item.size) : item.type}</span>
            <span>•</span>
            <span>
              {formatDistanceToNow(new Date(item.createdAt), {
                addSuffix: true,
              })}
            </span>
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
            <DropdownMenuItem onClick={() => onUnpin(item.id)}>
              <PinOff className="mr-2 h-4 w-4" /> Unpin
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
