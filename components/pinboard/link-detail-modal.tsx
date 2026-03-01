"use client";

import { useState } from "react";
import {
    ExternalLink,
    Copy,
    Trash2,
    Calendar,
    Globe,
    Tag,
    Pencil,
    X,
    Check,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TagInput } from "@/components/shared/tag-input";
import { useDeleteItem, useUpdateItem } from "@/hooks/use-items";
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
    const [isEditing, setIsEditing] = useState(false);

    // Edit form state — initialised from item
    const [editTitle, setEditTitle] = useState(item.title || "");
    const [editNote, setEditNote] = useState(item.note || "");
    const [editTags, setEditTags] = useState<string[]>(item.tags ?? []);

    const deleteItem = useDeleteItem();
    const updateItem = useUpdateItem();

    const url = item.content || "";
    const domain = getDomain(url);
    const faviconUrl = getFaviconUrl(url);

    // Wrap onOpenChange to reset edit state when modal is dismissed
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            setIsEditing(false);
        }
        onOpenChange(nextOpen);
    }

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
                onOpenChange(false); // delete closes modal directly — no need to reset edit state
            },
            onError: () => toast.error("Failed to delete"),
        });
    }

    function handleCancelEdit() {
        setEditTitle(item.title || "");
        setEditNote(item.note || "");
        setEditTags(item.tags ?? []);
        setIsEditing(false);
    }

    function handleSave() {
        if (!editTitle.trim()) {
            toast.error("Title cannot be empty");
            return;
        }
        updateItem.mutate(
            {
                id: item.id,
                title: editTitle.trim(),
                note: editNote.trim() || null,
                tags: editTags,
            },
            {
                onSuccess: () => {
                    toast.success("Link updated");
                    setIsEditing(false);
                },
                onError: () => toast.error("Failed to update link"),
            },
        );
    }

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
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
                                {isEditing ? (
                                    <Input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="h-8 text-base font-semibold"
                                        autoFocus
                                    />
                                ) : (
                                    <DialogTitle className="text-lg font-semibold truncate">
                                        {item.title}
                                    </DialogTitle>
                                )}
                                <DialogDescription className="flex items-center gap-1.5 text-xs mt-0.5">
                                    <Globe className="h-3 w-3" />
                                    {domain}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="flex-1 -mx-6 px-6">
                        <div className="space-y-4 pb-4">
                            {/* URL — always read-only */}
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
                            {isEditing ? (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Note
                                    </Label>
                                    <Textarea
                                        value={editNote}
                                        onChange={(e) => setEditNote(e.target.value)}
                                        placeholder="Add a note..."
                                        className="resize-none min-h-[80px]"
                                        rows={3}
                                    />
                                </div>
                            ) : (
                                item.note && (
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
                                )
                            )}

                            {/* Tags */}
                            {isEditing ? (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                        <Tag className="h-3 w-3" />
                                        Tags
                                    </Label>
                                    <TagInput
                                        tags={editTags}
                                        onChange={setEditTags}
                                        placeholder="Add tag..."
                                    />
                                </div>
                            ) : (
                                item.tags.length > 0 && (
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
                                )
                            )}

                            {/* Created Date */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
                                <Calendar className="h-3 w-3" />
                                Added {formatDate(item.createdAt)}
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Footer actions */}
                    {isEditing ? (
                        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                            <Button
                                variant="default"
                                size="sm"
                                className="flex-1"
                                onClick={handleSave}
                                disabled={updateItem.isPending}
                            >
                                <Check className="h-4 w-4 mr-1.5" />
                                {updateItem.isPending ? "Saving..." : "Save"}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={handleCancelEdit}
                                disabled={updateItem.isPending}
                            >
                                <X className="h-4 w-4 mr-1.5" />
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setShowDelete(true)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
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
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setShowDelete(true)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
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
