"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TodoColumn, TodoTask, useTodoStore } from "@/stores/todo-store";
import { TaskCard } from "./task-card";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Trash } from "lucide-react";
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
import { createTask, deleteColumn } from "@/app/actions/todo-actions";
import { toast } from "sonner";

interface ColumnProps {
  column: TodoColumn;
  tasks: TodoTask[];
  workspaceId: string;
}

export function Column({ column, tasks, workspaceId }: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
  });

  const { addTask, deleteColumn: deleteColumnState } = useTodoStore();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleAddTaskSubmit() {
    if (!newTaskTitle.trim()) return;

    setIsAddingTask(false);
    toast.promise(
      createTask({ workspaceId, columnId: column.id, title: newTaskTitle }),
      {
        loading: "Adding task...",
        success: (res) => {
          if (!res.success) throw new Error(res.error);
          addTask(res.task!);
          setNewTaskTitle("");
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

  return (
    <>
    <div
      ref={setNodeRef}
      className="flex flex-col w-80 shrink-0 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl max-h-full overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50"
    >
      <div className="flex items-center justify-between p-4 font-semibold text-foreground">
        <div className="flex items-center gap-2">
          <span>{column.title}</span>
          <span className="text-xs font-normal text-muted-foreground bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-200 dark:hover:bg-zinc-800">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>

      <div className="p-3 bg-zinc-100/50 dark:bg-zinc-900/50 mt-auto border-t border-zinc-200/50 dark:border-zinc-800/50">
        <Button
          onClick={() => setIsAddingTask(true)}
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>
    </div>

    <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Task title..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddTaskSubmit();
          }}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddingTask(false)}>Cancel</Button>
          <Button onClick={handleAddTaskSubmit}>Add Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
    </>
  );
}