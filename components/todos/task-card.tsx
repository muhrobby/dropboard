"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TodoTask, useTodoStore } from "@/stores/todo-store";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarIcon, AlignLeft, Trash } from "lucide-react";
import { format } from "date-fns";
import { deleteTask } from "@/app/actions/todo-actions";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

interface TaskCardProps {
  task: TodoTask;
  isOverlay?: boolean;
}

export function TaskCard({ task, isOverlay }: TaskCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const { deleteTask: deleteTaskState } = useTodoStore();

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    toast.promise(
      deleteTask(task.workspaceId, task.id),
      {
        loading: "Deleting task...",
        success: (res) => {
          if (!res.success) throw new Error(res.error);
          deleteTaskState(task.id);
          return "Task deleted";
        },
        error: "Failed to delete task",
      }
    );
  }

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 rounded-xl border-2 border-primary border-dashed h-24"
      />
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...(!isOverlay ? attributes : {})}
      {...(!isOverlay ? listeners : {})}
      className={cn(
        "group relative p-4 mb-2 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all duration-200 border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 rounded-xl",
        isOverlay && "rotate-2 scale-105 shadow-xl ring-2 ring-primary ring-offset-2 z-50 cursor-grabbing opacity-90"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-tight text-foreground">{task.title}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onPointerDown={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onPointerDown={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={handleDelete} className="text-rose-500">
              <Trash className="mr-2 h-4 w-4" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {task.description && (
        <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </div>
      )}

      <div className="flex items-center gap-3 mt-3">
        {task.description && (
          <AlignLeft className="h-3.5 w-3.5 text-muted-foreground/70" />
        )}
        {task.dueDate && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(new Date(task.dueDate), "MMM d")}
          </div>
        )}
      </div>
    </Card>
  );
}