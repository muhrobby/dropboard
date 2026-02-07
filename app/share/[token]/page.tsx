"use client";

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Clock,
  Eye,
  File,
  FileJson,
  FileSpreadsheet,
  FileArchive,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SharedItem = {
  id: string;
  type: "drop" | "link" | "note";
  title: string;
  content: string | null;
  note: string | null;
  tags: string[];
  createdAt: string;
};

type SharedFileAsset = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
};

type ShareData = {
  share: {
    id: string;
    token: string;
    expiresAt: string | null;
    accessCount: number;
    createdAt: string;
  };
  item: SharedItem;
  fileAsset: SharedFileAsset | null;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

function getFileIconInfo(mimeType: string) {
  let icon: React.ElementType = File;
  let color = "text-gray-500";
  let bgColor = "bg-gray-500/10";

  if (isImageMime(mimeType)) {
    icon = ImageIcon;
    color = "text-purple-500";
    bgColor = "bg-purple-500/10";
  } else if (mimeType === "application/pdf") {
    icon = FileText;
    color = "text-red-500";
    bgColor = "bg-red-500/10";
  } else if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("wordprocessingml")
  ) {
    icon = FileText;
    color = "text-blue-500";
    bgColor = "bg-blue-500/10";
  } else if (
    mimeType.includes("sheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheetml")
  ) {
    icon = FileSpreadsheet;
    color = "text-green-500";
    bgColor = "bg-green-500/10";
  } else if (
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("presentationml")
  ) {
    icon = FileText;
    color = "text-orange-500";
    bgColor = "bg-orange-500/10";
  } else if (
    mimeType.includes("zip") ||
    mimeType.includes("archive") ||
    mimeType.includes("compressed")
  ) {
    icon = FileArchive;
    color = "text-yellow-600";
    bgColor = "bg-yellow-600/10";
  } else if (mimeType.includes("json") || mimeType.includes("xml")) {
    icon = FileJson;
    color = "text-cyan-500";
    bgColor = "bg-cyan-500/10";
  } else if (mimeType.startsWith("text/")) {
    icon = FileText;
    color = "text-gray-500";
    bgColor = "bg-gray-500/10";
  }

  return { icon, color, bgColor };
}

function ShareDropView({
  item,
  fileAsset,
}: {
  item: SharedItem;
  fileAsset: SharedFileAsset;
}) {
  const isImage = isImageMime(fileAsset.mimeType);
  const { icon: FileIcon, color, bgColor } = getFileIconInfo(fileAsset.mimeType);

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="rounded-lg overflow-hidden bg-muted">
        {isImage ? (
          <img
            src={fileAsset.downloadUrl}
            alt={item.title}
            className="w-full max-h-[500px] object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center", bgColor)}>
              <FileIcon className={cn("w-10 h-10", color)} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{fileAsset.originalName}</p>
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{fileAsset.mimeType}</span>
        <span>{formatSize(fileAsset.sizeBytes)}</span>
      </div>

      {/* Note */}
      {item.note && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm whitespace-pre-wrap">{item.note}</p>
        </div>
      )}

      {/* Download Button */}
      <Button className="w-full" asChild>
        <a href={fileAsset.downloadUrl} download={fileAsset.originalName}>
          <Download className="mr-2 h-4 w-4" />
          Download File
        </a>
      </Button>
    </div>
  );
}

function ShareLinkView({ item }: { item: SharedItem }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <LinkIcon className="w-6 h-6 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{item.title}</p>
          <p className="text-sm text-muted-foreground truncate">{item.content}</p>
        </div>
      </div>

      {/* Note */}
      {item.note && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm whitespace-pre-wrap">{item.note}</p>
        </div>
      )}

      {/* Open Link Button */}
      <Button className="w-full" asChild>
        <a href={item.content || "#"} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Link
        </a>
      </Button>
    </div>
  );
}

function ShareNoteView({ item }: { item: SharedItem }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <StickyNote className="w-6 h-6 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg">{item.title}</h2>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-muted rounded-lg min-h-[200px]">
        <p className="text-sm whitespace-pre-wrap">{item.content}</p>
      </div>
    </div>
  );
}

export default function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<ShareData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShare() {
      try {
        const response = await fetch(`/api/v1/share/${token}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || "Share not found");
        }

        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load share");
      } finally {
        setIsLoading(false);
      }
    }

    fetchShare();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-lg">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Share Not Found</h2>
            <p className="text-sm text-muted-foreground">
              {error || "This share link is invalid or has expired."}
            </p>
            <Button variant="outline" asChild>
              <a href="/">Go to Homepage</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { share, item, fileAsset } = data;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl">{item.title}</CardTitle>
            <Badge variant="secondary" className="capitalize">
              {item.type}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(item.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {share.accessCount} views
            </span>
          </div>
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {item.type === "drop" && fileAsset && (
            <ShareDropView item={item} fileAsset={fileAsset} />
          )}
          {item.type === "link" && <ShareLinkView item={item} />}
          {item.type === "note" && <ShareNoteView item={item} />}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground">
          Shared via{" "}
          <a href="/" className="text-primary hover:underline">
            Dropboard
          </a>
        </p>
      </div>
    </div>
  );
}
