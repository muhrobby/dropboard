"use client";

import { useEffect, useState } from "react";
import { getBoardData } from "@/app/actions/todo-actions";
import { Board } from "@/components/todos/board";
import { PageHeader } from "@/components/patterns";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useTodoStore } from "@/stores/todo-store";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TodoPage() {
  const workspace = useWorkspaceStore((state) => state.getActiveWorkspace());
  const { setBoard } = useTodoStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBoard() {
      if (!workspace?.id) return;
      
      setLoading(true);
      setError(null);
      try {
        const data = await getBoardData(workspace.id);
        setBoard(data.columns, data.tasks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load board");
      } finally {
        setLoading(false);
      }
    }

    loadBoard();
  }, [workspace?.id, setBoard]);

  if (!workspace) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader title="Todo Board" description="Select a workspace to view your tasks." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl shrink-0">
        <div className="p-4 md:p-6 lg:px-8 max-w-full">
          <PageHeader
            title="Todo Board"
            description={`Manage tasks for ${workspace.name}`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-zinc-50/50 dark:bg-zinc-950/50 p-4 md:p-6 lg:p-8">
        {loading ? (
          <div className="flex gap-6 h-full">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-80 shrink-0 space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive" className="max-w-md mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <Board workspaceId={workspace.id} />
        )}
      </div>
    </div>
  );
}