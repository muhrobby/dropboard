"use client";

import { useWorkspaceStore } from "@/stores/workspace-store";
import { useCreateWorkspace } from "@/hooks/use-workspace";
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
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function WorkspaceSwitcher() {
  const { activeWorkspaceId, workspaces, setActiveWorkspace } =
    useWorkspaceStore();
  const createWorkspace = useCreateWorkspace();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");

  async function handleCreate() {
    if (!newName.trim()) return;

    try {
      const workspace = await createWorkspace.mutateAsync(newName.trim());
      setActiveWorkspace(workspace.id);
      setIsDialogOpen(false);
      setNewName("");
      toast.success("Workspace created");
    } catch {
      toast.error("Failed to create workspace");
    }
  }

  return (
    <div className="space-y-2">
      <Select
        value={activeWorkspaceId || undefined}
        onValueChange={setActiveWorkspace}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select workspace" />
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              <span className="truncate">{w.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="mr-2 h-3 w-3" />
            New Workspace
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
              onClick={() => setIsDialogOpen(false)}
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
    </div>
  );
}
