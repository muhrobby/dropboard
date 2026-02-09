"use client";

import { useState } from "react";
import {
    ExternalLink,
    Copy,
    Trash2,
    Calendar,
    Globe,
    Tag,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useDeleteItem } from "@/hooks/use-items";
import type { ItemResponse } from "@/types/api";
import { toast } from "sonner";

type LinkDetailModalProps = {
    item: ItemResponse;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace("www.", "");
    } catch {
        return url;
    }
}

function getFaviconUrl(url: string): string {
    try {
        const domain = new URL(url).origin;
        return `${domain}/favicon.ico`;
    } catch {
        return "";
    }
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function LinkDetailModal({
    item,
    open,
    onOpenChange,
}: LinkDetailModalProps) {
    const [showDelete, setShowDelete] = useState(false);
    const deleteItem = useDeleteItem();

    const url = item.content || "";
    const domain = getDomain(url);
    const faviconUrl = getFaviconUrl(url);

    function handleOpen() {
        window.open(url, "_blank", "noopener,noreferrer");
    }

    function handleCopy() {
        navigator.clipboard.writeText(url);
        toast.success("URL copied to clipboard");
    }

    function handleDelete() {
        deleteItem.mutate(item.id, {
            onSuccess: () => {
                toast.success("Link deleted");
                setShowDelete(false);
                onOpenChange(false);
            },
            onError: () => toast.error("Failed to delete"),
        });
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                {faviconUrl ? (
                                    <img
                                        src={faviconUrl}
                                        alt=""
                                        className="h-5 w-5"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                            (
                                                e.target as HTMLImageElement
                                            ).nextElementSibling?.classList.remove("hidden");
                                        }}
                                    />
                                ) : null}
                                <ExternalLink
                                    className={`h-5 w-5 text-muted-foreground ${faviconUrl ? "hidden" : ""}`}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <DialogTitle className="text-lg font-semibold truncate">
                                    {item.title}
                                </DialogTitle>
                                <DialogDescription className="flex items-center gap-1.5 text-xs">
                                    <Globe className="h-3 w-3" />
                                    {domain}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="flex-1 -mx-6 px-6">
                        <div className="space-y-4 pb-4">
                            {/* URL */}
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    URL
                                </p>
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                                    <p className="text-sm text-foreground break-all flex-1">
                                        {url}
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0"
                                        onClick={handleCopy}
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Note */}
                            {item.note && (
                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Note
                                    </p>
                                    <div className="rounded-lg bg-muted/50 p-3">
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                            {item.note}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            {item.tags.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                        <Tag className="h-3 w-3" />
                                        Tags
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.tags.map((tag) => (
                                            <Badge key={tag} variant="secondary" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Created Date */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
                                <Calendar className="h-3 w-3" />
                                Added {formatDate(item.createdAt)}
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Footer actions */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                        <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={handleOpen}
                        >
                            <ExternalLink className="h-4 w-4 mr-1.5" />
                            Open Link
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={handleCopy}
                        >
                            <Copy className="h-4 w-4 mr-1.5" />
                            Copy URL
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowDelete(true)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={showDelete}
                onOpenChange={setShowDelete}
                title="Delete link"
                description="This link will be permanently deleted."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={handleDelete}
                isPending={deleteItem.isPending}
            />
        </>
    );
}
