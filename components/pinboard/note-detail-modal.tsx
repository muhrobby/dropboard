"use client";

import { useState } from "react";
import { StickyNote, Trash2, Calendar, Lock, Loader2, Copy, Pencil, X, Check, Tag } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TagInput } from "@/components/shared/tag-input";
import { RichTextEditor } from "@/components/pinboard/rich-text-editor";
import { useDeleteItem, useUpdateItem } from "@/hooks/use-items";
import type { ItemResponse } from "@/types/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NoteDetailModalProps = {
    item: ItemResponse;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

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

export function NoteDetailModal({
    item,
    open,
    onOpenChange,
}: NoteDetailModalProps) {
    const [showDelete, setShowDelete] = useState(false);
    const [password, setPassword] = useState("");
    const [unlockedContent, setUnlockedContent] = useState<string | null>(null);
    const [isUnlocking, setIsUnlocking] = useState(false);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(item.title || "");
    const [editTags, setEditTags] = useState<string[]>(item.tags ?? []);
    const [editContent, setEditContent] = useState(item.content || "");

    const deleteItem = useDeleteItem();
    const updateItem = useUpdateItem();

    // Wrap onOpenChange to reset transient state when the modal is dismissed
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            setPassword("");
            setUnlockedContent(null);
            setIsUnlocking(false);
            setIsEditing(false);
        }
        onOpenChange(nextOpen);
    }

    function handleDelete() {
        deleteItem.mutate(item.id, {
            onSuccess: () => {
                toast.success("Note deleted");
                setShowDelete(false);
                onOpenChange(false);
            },
            onError: () => toast.error("Failed to delete"),
        });
    }

    function handleCopy() {
        const htmlContent = unlockedContent || item.content;
        if (htmlContent) {
            const plainText = htmlContent.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
            navigator.clipboard.writeText(plainText);
            toast.success("Note copied to clipboard");
        }
    }

    async function handleUnlock(e: React.FormEvent) {
        e.preventDefault();
        if (!password.trim()) return;

        setIsUnlocking(true);
        try {
            const res = await fetch(`/api/v1/items/${item.id}/unlock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error.message || "Failed to unlock");

            setUnlockedContent(json.data.content);
            setEditContent(json.data.content);
            toast.success("Note unlocked");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Incorrect password");
        } finally {
            setIsUnlocking(false);
        }
    }

    function handleCancelEdit() {
        setEditTitle(item.title || "");
        setEditTags(item.tags ?? []);
        setEditContent(unlockedContent ?? item.content ?? "");
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
                tags: editTags,
                content: editContent,
            },
            {
                onSuccess: () => {
                    toast.success("Note updated");
                    setIsEditing(false);
                    // Sync unlocked content view if note was unlocked
                    if (unlockedContent !== null) {
                        setUnlockedContent(editContent);
                    }
                },
                onError: () => toast.error("Failed to update note"),
            },
        );
    }

    const isLocked = item.isProtected && unlockedContent === null;
    const displayContent = isLocked
        ? null
        : (unlockedContent || item.content || "No content");

    // Can edit content only if not protected, or if unlocked
    const canEditContent = !item.isProtected || unlockedContent !== null;

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 rounded-[24px] overflow-hidden border-zinc-200/60 dark:border-zinc-800/60 shadow-2xl bg-white dark:bg-zinc-950">
                    <DialogHeader className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 backdrop-blur-sm shrink-0">
                        <div className="flex items-start gap-4">
                            <div className="flex items-center justify-center size-10 rounded-xl bg-amber-500/10 shrink-0 mt-0.5">
                                <StickyNote className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                            </div>
                            <div className="space-y-1.5 text-left min-w-0 pr-4 flex-1">
                                {isEditing ? (
                                    <Input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="h-8 text-base font-semibold"
                                        autoFocus
                                    />
                                ) : (
                                    <DialogTitle className="text-lg font-semibold text-foreground leading-snug">
                                        {item.title}
                                    </DialogTitle>
                                )}
                                <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 opacity-70" />
                                        {formatDate(item.createdAt)}
                                    </span>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 dark:bg-[#0a0a0a]">
                        <div className="space-y-6">
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
                                    <div className="flex flex-wrap gap-2">
                                        {item.tags.map((tag) => (
                                            <Badge key={tag} variant="secondary" className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm text-zinc-600 dark:text-zinc-300">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )
                            )}

                            {/* Content Block */}
                            {isLocked ? (
                                /* Locked — show password form (editing not available) */
                                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-sm">
                                    <form onSubmit={handleUnlock} className="flex flex-col items-center justify-center py-10 space-y-5">
                                        <div className="size-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-2">
                                            <Lock className="h-8 w-8" />
                                        </div>
                                        <div className="text-center space-y-1.5">
                                            <p className="text-base font-semibold text-foreground">Password Protected Note</p>
                                            <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">Enter password to view this secure content</p>
                                        </div>
                                        <div className="flex w-full max-w-sm items-center gap-3 mt-4">
                                            <Input
                                                type="password"
                                                placeholder="Enter password..."
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                disabled={isUnlocking}
                                                className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20"
                                            />
                                            <Button type="submit" disabled={!password.trim() || isUnlocking} className="h-11 rounded-xl px-6">
                                                {isUnlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock"}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            ) : isEditing && canEditContent ? (
                                /* Edit mode — rich text editor */
                                <div className="rounded-2xl bg-white dark:bg-[#111113] border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
                                    <div className="h-1 w-full bg-amber-400/80 dark:bg-amber-500/50 shrink-0" />
                                    <div className="p-3">
                                        <RichTextEditor
                                            value={editContent}
                                            onChange={setEditContent}
                                            placeholder="Write your note..."
                                            minHeight="120px"
                                        />
                                    </div>
                                </div>
                            ) : (
                                /* Read mode */
                                <div className="group rounded-2xl bg-white dark:bg-[#111113] border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm relative overflow-hidden flex flex-col">
                                    <div className="h-1 w-full bg-amber-400/80 dark:bg-amber-500/50 shrink-0" />

                                    <div className="flex-1 max-h-[50vh] overflow-y-auto p-5 sm:p-7 custom-scrollbar">
                                        <div className={cn(
                                            "text-[15px] sm:text-base leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium",
                                            "prose prose-sm dark:prose-invert max-w-none",
                                            "prose-p:mb-2 prose-p:last:mb-0",
                                            "prose-strong:font-semibold",
                                            "prose-em:italic",
                                            "prose-ul:list-disc prose-ul:pl-5 prose-ul:mb-2",
                                            "prose-ol:list-decimal prose-ol:pl-5 prose-ol:mb-2",
                                            "prose-li:mb-0.5",
                                            "prose-blockquote:border-l-2 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-muted-foreground",
                                            "prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:text-[0.85em] prose-code:font-mono",
                                            "prose-pre:bg-muted prose-pre:rounded-md prose-pre:p-3 prose-pre:overflow-x-auto",
                                            "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
                                        )}
                                            dangerouslySetInnerHTML={{ __html: displayContent ?? "" }}
                                        />
                                    </div>

                                    {/* Copy Button Overlay */}
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-8 bg-zinc-100/80 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 backdrop-blur-sm text-xs rounded-lg shadow-sm"
                                            onClick={handleCopy}
                                        >
                                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                                            Copy
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer actions */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 backdrop-blur-sm shrink-0">
                        <Button
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-500/10 rounded-xl px-4 h-10"
                            onClick={() => setShowDelete(true)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Note
                        </Button>

                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        disabled={updateItem.isPending}
                                        className="rounded-xl px-4 h-10 font-medium"
                                    >
                                        <X className="h-4 w-4 mr-1.5" />
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={updateItem.isPending}
                                        className="rounded-xl px-6 h-10 font-medium"
                                    >
                                        <Check className="h-4 w-4 mr-1.5" />
                                        {updateItem.isPending ? "Saving..." : "Save"}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {/* Only show Edit button when not locked */}
                                    {!isLocked && (
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsEditing(true)}
                                            className="rounded-xl px-4 h-10 font-medium bg-white border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-foreground shadow-sm"
                                        >
                                            <Pencil className="h-4 w-4 mr-1.5" />
                                            Edit
                                        </Button>
                                    )}
                                    <Button
                                        variant="secondary"
                                        onClick={() => onOpenChange(false)}
                                        className="rounded-xl px-6 h-10 font-medium bg-white border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-foreground shadow-sm"
                                    >
                                        Close
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={showDelete}
                onOpenChange={setShowDelete}
                title="Delete note permanently?"
                description={`You are about to delete "${item.title}". This action cannot be undone.`}
                confirmLabel="Delete Note"
                variant="destructive"
                onConfirm={handleDelete}
                isPending={deleteItem.isPending}
            />

        </>
    );
}
