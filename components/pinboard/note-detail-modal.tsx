"use client";

import { useState } from "react";
import { StickyNote, Trash2, X, Calendar } from "lucide-react";
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

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-500/10">
                                <StickyNote className="h-4 w-4 text-yellow-500" />
                            </div>
                            <DialogTitle className="text-lg font-semibold">
                                {item.title}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(item.createdAt)}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="flex-1 -mx-6 px-6">
                        <div className="space-y-4 pb-4">
                            {/* Content */}
                            <div className="rounded-lg bg-muted/50 p-4">
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                    {item.content || "No content"}
                                </p>
                            </div>

                            {/* Tags */}
                            {item.tags.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
                        </div>
                    </ScrollArea>

                    {/* Footer actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                        >
                            Close
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowDelete(true)}
                        >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={showDelete}
                onOpenChange={setShowDelete}
                title="Delete note"
                description="This note will be permanently deleted."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={handleDelete}
                isPending={deleteItem.isPending}
            />
        </>
    );
}
