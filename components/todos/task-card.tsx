"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TodoTask, useTodoStore } from "@/stores/todo-store";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarIcon, AlignLeft, Trash, ArrowDown, ArrowUp, Minus, AlertCircle, CheckSquare, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, differenceInHours, isPast, startOfDay } from "date-fns";
import { deleteTask } from "@/app/actions/todo-actions";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

interface TaskCardProps {
  task: TodoTask;
  isOverlay?: boolean;
  onClick?: () => void;
  onHover?: (taskId: string | null) => void;
}

export function TaskCard({ task, isOverlay, onClick, onHover }: TaskCardProps) {
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
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteConfirm() {
    setIsDeleting(false);
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

  const renderPriorityIcon = (priority: string) => {
    switch (priority) {
      case "low": return <ArrowDown className="h-3.5 w-3.5 text-blue-500" />;
      case "high": return <ArrowUp className="h-3.5 w-3.5 text-orange-500" />;
      case "urgent": return <AlertCircle className="h-3.5 w-3.5 text-rose-500" />;
      default: return <Minus className="h-3.5 w-3.5 text-zinc-400" />;
    }
  };

  const getDueDateColor = (dueDate: Date | string) => {
    const date = new Date(dueDate);
    const now = new Date();
    
    // Normalize to start of day for overdue check
    if (isPast(date) && startOfDay(date).getTime() < startOfDay(now).getTime()) {
      return "text-rose-500 bg-rose-50 dark:bg-rose-950/50 border border-rose-200/50 dark:border-rose-900/50";
    }
    
    const hoursLeft = differenceInHours(date, now);
    if (hoursLeft > 0 && hoursLeft <= 48) {
      return "text-amber-600 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/50 dark:border-amber-900/50";
    }
    
    return "text-muted-foreground bg-zinc-50 dark:bg-zinc-800/80 border border-transparent";
  };

  const coverImage = task.attachments?.find((a) => a.isCover);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...(!isOverlay ? attributes : {})}
      {...(!isOverlay ? listeners : {})}
      className={cn(
        "group relative cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all duration-200 border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 rounded-xl mb-2 overflow-hidden",
        isOverlay && "rotate-2 scale-105 shadow-xl ring-2 ring-primary ring-offset-2 z-50 cursor-grabbing opacity-90"
      )}
      onClick={onClick}
      onMouseEnter={() => onHover?.(task.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {coverImage && (
        <div className="w-full h-32 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200/50 dark:border-zinc-800/50">
          <img 
            src={coverImage.url} 
            alt="Cover" 
            className="w-full h-full object-cover object-center pointer-events-none"
          />
        </div>
      )}

      <div className="p-3 sm:p-4">
        {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map(label => (
            <Badge key={label} variant="secondary" className="px-1.5 py-0.5 text-[10px] h-4 font-medium bg-zinc-100 hover:bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800">
              {label}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-tight text-foreground">{task.title}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onPointerDown={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onPointerDown={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => setIsDeleting(true)} className="text-rose-500">
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

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex-wrap">
        {task.priority && (
          <div title={`Priority: ${task.priority}`} className="flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/80 rounded-sm p-1">
            {renderPriorityIcon(task.priority)}
          </div>
        )}
        {task.dueDate && (
          <div className={cn(
            "flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-sm",
            getDueDateColor(task.dueDate)
          )}>
            <CalendarIcon className="h-3 w-3" />
            {format(new Date(task.dueDate), "MMM d")}
          </div>
        )}
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-3 justify-end text-muted-foreground">
          {task.description && (
            <AlignLeft className="h-3.5 w-3.5" />
          )}
          
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-medium" title="Subtasks">
              <CheckSquare className="h-3 w-3" />
              <span>{task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}</span>
            </div>
          )}

          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-medium" title="Attachments">
              <Paperclip className="h-3 w-3" />
              <span>{task.attachments.length}</span>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the task &quot;{task.title}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleting(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-rose-500 hover:bg-rose-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </Card>
  );
}