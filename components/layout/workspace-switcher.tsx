/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/use-workspace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ArrowUpRight, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function WorkspaceSwitcher() {
  const { activeWorkspaceId, workspaces, setActiveWorkspace } =
    useWorkspaceStore();
  useWorkspaces(); // Fetch and sync workspaces to store
  const createWorkspace = useCreateWorkspace();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [showTierLimitModal, setShowTierLimitModal] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    if (!newName.trim()) return;

    try {
      const workspace = await createWorkspace.mutateAsync(newName.trim());
      setActiveWorkspace(workspace.id);
      setIsDialogOpen(false);
      setNewName("");
      toast.success("Workspace created");
    } catch (error) {
      const err = error as any;

      if (err?.message?.includes("Upgrade plan to create more workspaces")) {
        setShowTierLimitModal(true);
      } else {
        toast.error("Failed to create workspace");
      }
    }
  }

  return (
    <div className="space-y-3">
      <Select
        value={activeWorkspaceId || undefined}
        onValueChange={setActiveWorkspace}
      >
        <SelectTrigger className="w-full h-11 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm transition-all focus:ring-primary/20">
          <SelectValue placeholder="Select workspace" />
        </SelectTrigger>
        <SelectContent className="rounded-xl shadow-xl border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95">
          {workspaces.map((w) => (
            <SelectItem key={w.id} value={w.id} className="rounded-lg py-2.5 cursor-pointer">
              <span className="font-medium truncate">{w.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full h-10 rounded-xl border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-muted-foreground hover:text-foreground transition-all group">
            <Plus className="mr-2 size-4 transition-transform group-hover:scale-110" />
            <span className="font-medium">New Workspace</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team Workspace</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Workspace name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setNewName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createWorkspace.isPending}
            >
              {createWorkspace.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTierLimitModal} onOpenChange={setShowTierLimitModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              <DialogTitle className="text-lg">Upgrade Required</DialogTitle>
            </div>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Paket <strong>Free</strong> Anda hanya mengizinkan <strong>1 workspace personal</strong>.
              Untuk membuat workspace tim, silakan upgrade ke paket <strong>Pro</strong> atau <strong>Business</strong>.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTierLimitModal(false);
                  setIsDialogOpen(false);
                }}
              >
                Tutup
              </Button>
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => {
                  setShowTierLimitModal(false);
                  setIsDialogOpen(false);
                  router.push("/dashboard/settings/billing");
                }}
              >
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  <span>Upgrade Paket</span>
                </div>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
