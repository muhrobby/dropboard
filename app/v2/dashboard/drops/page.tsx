"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageDown, FolderUp, Star, Trash2 } from "lucide-react";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useWorkspaceStore } from "@/stores/workspace-store";

export default function V2DropsPage() {
  const workspace = useWorkspaceStore((s) => s.getActiveWorkspace());

  return (
    <div className="p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Drops</h1>
        <p className="text-muted-foreground">
          Drag and drop files from anywhere
        </p>
      </div>

      {/* Drag and Drop Area */}
      <div className="border-2xl border-dashed rounded-2xl bg-muted/30 min-h-[600px] flex items-center justify-center">
        <div className="text-center">
          <ImageDown className="h-24 w-24 text-muted-foreground" />
          <div className="mt-4 space-y-2">
            <p className="text-lg font-medium">Drop files here</p>
            <p className="text-sm text-muted-foreground">
              Or browse your workspace
            </p>
            <Button>
              Browse Files
            </Button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="mt-8">
        <p className="text-center text-muted-foreground">
          No drops yet
        </p>
      </div>
    </div>
  );
}
