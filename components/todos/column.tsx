"use client";

import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TodoColumn, TodoTask, useTodoStore } from "@/stores/todo-store";
import { TaskCard } from "./task-card";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Trash, ClipboardList } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { createTask, deleteColumn, updateColumn } from "@/app/actions/todo-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ColumnProps {
  column: TodoColumn;
  tasks: TodoTask[];
  workspaceId: string;
  onTaskClick?: (task: TodoTask) => void;
  onTaskHover?: (taskId: string | null) => void;
}

export function Column({ column, tasks, workspaceId, onTaskClick, onTaskHover }: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
  });

  const { addTask, deleteColumn: deleteColumnState, updateColumn: updateColumnState } = useTodoStore();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingWip, setIsSettingWip] = useState(false);
  const [wipInput, setWipInput] = useState(column.wipLimit?.toString() ?? "");
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Focus the inline input when it appears
  useEffect(() => {
    if (isAddingTask) {
      setTimeout(() => inlineInputRef.current?.focus(), 0);
    }
  }, [isAddingTask]);

  async function handleAddTaskSubmit() {
    if (!newTaskTitle.trim()) {
      setIsAddingTask(false);
      return;
    }
    const titleToCreate = newTaskTitle.trim();
    setNewTaskTitle("");
    setIsAddingTask(false);
    toast.promise(
      createTask({ workspaceId, columnId: column.id, title: titleToCreate }),
      {
        loading: "Adding task...",
        success: (res) => {
          if (!res.success) throw new Error(res.error);
          addTask(res.task!);
          return "Task added";
        },
        error: "Failed to add task",
      }
    );
  }

  async function handleDeleteColumnConfirm() {
    setIsDeleting(false);
    toast.promise(
      deleteColumn(workspaceId, column.id),
      {
        loading: "Deleting column...",
        success: (res) => {
          if (!res.success) throw new Error(res.error);
          deleteColumnState(column.id);
          return "Column deleted";
        },
        error: "Failed to delete column",
      }
    );
  }

  async function handleSetWipLimit() {
    const val = wipInput.trim();
    const parsed = val === "" ? null : parseInt(val, 10);
    if (val !== "" && (isNaN(parsed!) || parsed! < 1)) {
      toast.error("WIP limit must be a positive number");
      return;
    }
    setIsSettingWip(false);
    updateColumnState(column.id, { wipLimit: parsed });
    const res = await updateColumn({ id: column.id, workspaceId, wipLimit: parsed });
    if (!res.success) {
      updateColumnState(column.id, { wipLimit: column.wipLimit }); // revert
      toast.error("Failed to update WIP limit");
    } else {
      toast(parsed ? `WIP limit set to ${parsed}` : "WIP limit removed");
    }
  }

  const isOverWip = column.wipLimit !== null && column.wipLimit !== undefined && tasks.length > column.wipLimit;
  const isAtWip = column.wipLimit !== null && column.wipLimit !== undefined && tasks.length === column.wipLimit;

  return (
    <>
    <div
      ref={setNodeRef}
      className="flex flex-col w-80 shrink-0 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl max-h-full overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50"
    >
      <div className="flex items-center justify-between p-4 font-semibold text-foreground">
        <div className="flex items-center gap-2">
          <span>{column.title}</span>
          <span className={cn(
            "text-xs font-normal px-2 py-0.5 rounded-full transition-colors",
            isOverWip
              ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
              : isAtWip
              ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
              : "bg-zinc-200 text-muted-foreground dark:bg-zinc-800"
          )}>
            {tasks.length}{column.wipLimit ? `/${column.wipLimit}` : ""}
          </span>
          {isOverWip && (
            <span className="text-[10px] font-medium text-rose-500">Over limit</span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-200 dark:hover:bg-zinc-800">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setWipInput(column.wipLimit?.toString() ?? ""); setIsSettingWip(true); }}>
              Set WIP Limit
            </DropdownMenuItem>
            {column.wipLimit && (
              <DropdownMenuItem onClick={() => { updateColumnState(column.id, { wipLimit: null }); updateColumn({ id: column.id, workspaceId, wipLimit: null }); }}>
                Remove WIP Limit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setIsDeleting(true)} className="text-rose-500">
              <Trash className="mr-2 h-4 w-4" />
              Delete Column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} onHover={onTaskHover} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="h-10 w-10 rounded-full bg-zinc-200/80 dark:bg-zinc-800 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-xs text-muted-foreground/70 max-w-[160px]">
              No tasks yet. Drop one here or click <span className="font-medium">Add Task</span> below.
            </p>
          </div>
        )}
      </div>

      <div className="p-3 bg-zinc-100/50 dark:bg-zinc-900/50 mt-auto border-t border-zinc-200/50 dark:border-zinc-800/50">
        {isAddingTask ? (
          <div className="space-y-2">
            <Input
              ref={inlineInputRef}
              placeholder="Task title…"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTaskSubmit();
                if (e.key === "Escape") { setIsAddingTask(false); setNewTaskTitle(""); }
              }}
              className="h-8 text-sm bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleAddTaskSubmit} disabled={!newTaskTitle.trim()}>
                Add Task
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => { setIsAddingTask(false); setNewTaskTitle(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setIsAddingTask(true)}
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        )}
      </div>
    </div>

    <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the column and all tasks inside it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsDeleting(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteColumnConfirm} className="bg-rose-500 hover:bg-rose-600">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={isSettingWip} onOpenChange={setIsSettingWip}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set WIP Limit for &ldquo;{column.title}&rdquo;</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          The column header will turn amber when at the limit and red when exceeded. Leave blank to remove the limit.
        </p>
        <Input
          type="number"
          min={1}
          placeholder="e.g. 3"
          value={wipInput}
          onChange={(e) => setWipInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSetWipLimit(); }}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsSettingWip(false)}>Cancel</Button>
          <Button onClick={handleSetWipLimit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}