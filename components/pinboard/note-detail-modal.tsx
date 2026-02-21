"use client";

import { useState, useEffect } from "react";
import { StickyNote, Trash2, Calendar, Lock, Loader2, Copy } from "lucide-react";
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
import { useDeleteItem } from "@/hooks/use-items";
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
    const deleteItem = useDeleteItem();

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
        const contentToCopy = unlockedContent || item.content;
        if (contentToCopy) {
            navigator.clipboard.writeText(contentToCopy);
            toast.success("Note copied to clipboard");
        }
    }

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            setPassword("");
            setUnlockedContent(null);
            setIsUnlocking(false);
        }
    }, [open]);

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
            toast.success("Note unlocked");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Incorrect password");
        } finally {
            setIsUnlocking(false);
        }
    }

    const displayContent = item.isProtected && unlockedContent === null
        ? null
        : (unlockedContent || item.content || "No content");

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 rounded-[24px] overflow-hidden border-zinc-200/60 dark:border-zinc-800/60 shadow-2xl bg-white dark:bg-zinc-950">
                    <DialogHeader className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 backdrop-blur-sm shrink-0">
                        <div className="flex items-start gap-4">
                            <div className="flex items-center justify-center size-10 rounded-xl bg-amber-500/10 shrink-0 mt-0.5">
                                <StickyNote className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                            </div>
                            <div className="space-y-1.5 text-left min-w-0 pr-4 flex-1">
                                <DialogTitle className="text-lg font-semibold text-foreground leading-snug">
                                    {item.title}
                                </DialogTitle>
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
                            {item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {item.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm text-zinc-600 dark:text-zinc-300">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Content Block */}
                            {item.isProtected && unlockedContent === null ? (
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
                            ) : (
                                <div className="group rounded-2xl bg-white dark:bg-[#111113] border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm relative overflow-hidden flex flex-col">
                                    {/* Top decorative bar */}
                                    <div className="h-1 w-full bg-amber-400/80 dark:bg-amber-500/50 shrink-0" />
                                    
                                    <div className="flex-1 max-h-[50vh] overflow-y-auto p-5 sm:p-7 custom-scrollbar">
                                        <p className="text-[15px] sm:text-base whitespace-pre-wrap leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium">
                                            {displayContent}
                                        </p>
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
                        <Button
                            variant="secondary"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl px-6 h-10 font-medium bg-white border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-foreground shadow-sm"
                        >
                            Close
                        </Button>
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
