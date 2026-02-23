"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useTodoStore } from "@/stores/todo-store";
import { moveTask, createColumn } from "@/app/actions/todo-actions";
import { Column } from "./column";
import { TaskCard } from "./task-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface BoardProps {
  workspaceId: string;
}

export function Board({ workspaceId }: BoardProps) {
  const { columns, tasks, moveTaskOptimistic, addColumn } = useTodoStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [originalTask, setOriginalTask] = useState<{ columnId: string; order: number } | null>(null);

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === "Task") {
      setActiveId(active.id as string);
      const task = tasks.find((t) => t.id === active.id);
      if (task) {
        setOriginalTask({ columnId: task.columnId, order: task.order });
      }
    }
    if (type === "Column") {
      setActiveColumnId(active.id as string);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverTask = over.data.current?.type === "Task";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    if (isOverTask) {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      if (activeTask.columnId !== overTask.columnId) {
        moveTaskOptimistic(activeId as string, overTask.columnId, overTask.order);
      }
    }

    if (isOverColumn) {
      const isDifferentColumn = activeTask.columnId !== overId;
      if (isDifferentColumn) {
        const targetTasks = tasks.filter((t) => t.columnId === overId);
        moveTaskOptimistic(activeId as string, overId as string, targetTasks.length);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveColumnId(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverTask = over.data.current?.type === "Task";
    const isOverColumn = over.data.current?.type === "Column";

    if (isActiveTask) {
      const activeTask = tasks.find((t) => t.id === activeId);
      if (!activeTask) return;

      let newColumnId = activeTask.columnId;
      let newOrder = activeTask.order;

      if (isOverTask) {
        const overTask = tasks.find((t) => t.id === overId);
        if (overTask) {
          newColumnId = overTask.columnId;
          const targetTasks = tasks
            .filter((t) => t.columnId === newColumnId)
            .sort((a, b) => a.order - b.order);
          newOrder = targetTasks.findIndex((t) => t.id === overTask.id);
        }
      } else if (isOverColumn) {
        newColumnId = overId;
        const targetTasks = tasks.filter((t) => t.columnId === overId);
        // If handleDragOver already moved it here, its length includes it
        newOrder = Math.max(0, targetTasks.length - 1);
      }

      if (
        originalTask &&
        (originalTask.columnId !== newColumnId || originalTask.order !== newOrder)
      ) {
        moveTaskOptimistic(activeId, newColumnId, newOrder);
        try {
          const res = await moveTask({
            taskId: activeId,
            workspaceId,
            newColumnId,
            newOrder,
          });
          if (!res.success) throw new Error(res.error);
        } catch (error) {
          toast.error("Failed to move task", { description: error instanceof Error ? error.message : "Unknown error" });
          // Could revert state here
        }
      }
      setOriginalTask(null);
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;
  const activeColumn = activeColumnId ? columns.find((c) => c.id === activeColumnId) : null;

  async function handleAddColumnSubmit() {
    if (!newColumnTitle.trim()) return;

    setIsAddingColumn(false);
    toast.promise(
      createColumn({ workspaceId, title: newColumnTitle }),
      {
        loading: "Adding column...",
        success: (res) => {
          if (!res.success) throw new Error(res.error);
          addColumn(res.column!);
          setNewColumnTitle("");
          return "Column added";
        },
        error: "Failed to add column",
      }
    );
  }

  return (
    <>
      <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-6 pb-4 shrink-0 overflow-x-auto min-w-full">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={tasks.filter((t) => t.columnId === column.id).sort((a, b) => a.order - b.order)}
            workspaceId={workspaceId}
          />
        ))}

        <Button
          onClick={() => setIsAddingColumn(true)}
          variant="outline"
          className="h-12 w-80 shrink-0 bg-white/50 dark:bg-zinc-900/50 border-dashed hover:border-primary/50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Column
        </Button>
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
        {activeColumn ? (
          <div className="w-80 h-full rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 border-2 border-primary/50" />
        ) : null}
      </DragOverlay>
    </DndContext>

    <Dialog open={isAddingColumn} onOpenChange={setIsAddingColumn}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Column</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Column title..."
          value={newColumnTitle}
          onChange={(e) => setNewColumnTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddColumnSubmit();
          }}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddingColumn(false)}>Cancel</Button>
          <Button onClick={handleAddColumnSubmit}>Add Column</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}