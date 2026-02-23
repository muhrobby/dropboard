"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { useTodoStore, TodoTask } from "@/stores/todo-store";
import { moveTask, createColumn, updateTask } from "@/app/actions/todo-actions";
import { useSession } from "@/lib/auth-client";
import { Column } from "./column";
import { TaskCard } from "./task-card";
import { TaskDetailSheet } from "./task-detail-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Filter, SearchX, Search, ArrowUpDown, Rows3, User } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface BoardProps {
  workspaceId: string;
}

export function Board({ workspaceId }: BoardProps) {
  const { columns, tasks, moveTaskOptimistic, addColumn, updateTask: updateTaskState } = useTodoStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [originalTask, setOriginalTask] = useState<{ columnId: string; order: number } | null>(null);

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  // Filter states
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "dueDate" | "priority" | "alpha">("default");

  // Hover tracking for keyboard shortcuts
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  // Group By (swimlanes)
  const [groupBy, setGroupBy] = useState<"none" | "assignee">("none");

  // Session for self-assign shortcut
  const { data: session } = useSession();

  // Workspace members for swimlanes
  const { data: membersResponse } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/members`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!workspaceId,
  });
  const members: { userId: string; user: { name: string | null; image: string | null } }[] = membersResponse?.data || [];

  const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if typing in an input/textarea/select/contenteditable
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    const isEditing = tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;

    // "/" — focus search (allow even when typing, but skip if already in search)
    if (e.key === "/" && target.id !== "board-search") {
      e.preventDefault();
      document.getElementById("board-search")?.focus();
      return;
    }

    if (isEditing) return;

    // "D" — open detail sheet for hovered card
    if (e.key === "d" || e.key === "D") {
      if (hoveredTaskId) {
        setSelectedTaskId(hoveredTaskId);
        setIsTaskDetailOpen(true);
      }
      return;
    }

    // "Space" — self-assign hovered card
    if (e.key === " ") {
      e.preventDefault();
      if (hoveredTaskId && session?.user?.id) {
        const hoveredTask = tasks.find((t) => t.id === hoveredTaskId);
        if (hoveredTask) {
          const newAssignee = hoveredTask.assignedTo === session.user.id ? null : session.user.id;
          updateTaskState(hoveredTaskId, { assignedTo: newAssignee }); // optimistic
          updateTask({ id: hoveredTaskId, workspaceId, assignedTo: newAssignee })
            .then((res) => {
              if (res.success) {
                toast(newAssignee ? "Assigned to you" : "Unassigned");
              } else {
                updateTaskState(hoveredTaskId, { assignedTo: hoveredTask.assignedTo }); // revert
              }
            });
        }
      }
      return;
    }
  }, [hoveredTaskId, session, tasks, workspaceId]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null),
    [selectedTaskId, tasks]
  );

  // Derive unique labels for the filter menu
  const allLabels = Array.from(new Set(tasks.flatMap(t => t.labels || [])));

  // Filtered + sorted tasks
  const filteredTasks = tasks
    .filter(task => {
      if (filterPriority && task.priority !== filterPriority) return false;
      if (filterLabel && !(task.labels || []).includes(filterLabel)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = task.title?.toLowerCase().includes(q);
        const inDesc = task.description?.toLowerCase().includes(q);
        if (!inTitle && !inDesc) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "dueDate") {
        if (!a.dueDate && !b.dueDate) return a.order - b.order;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === "priority") {
        const pa = PRIORITY_ORDER[a.priority] ?? 99;
        const pb = PRIORITY_ORDER[b.priority] ?? 99;
        return pa !== pb ? pa - pb : a.order - b.order;
      }
      if (sortBy === "alpha") {
        return a.title.localeCompare(b.title);
      }
      return a.order - b.order; // default: board order
    });

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
    if (!over) {
      // It was clicked, not dragged over anything else
      if (active.data.current?.type === "Task" && !originalTask) {
        // Handle click to open detail view (if active is task)
      }
      return;
    }

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
    <div className="flex flex-col h-full space-y-4 relative">
      <div className="flex items-center justify-between px-2 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="board-search"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 w-44 shadow-sm text-sm focus-visible:w-60 transition-all duration-200"
            />
          </div>

          {/* Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 shadow-sm">
                <Filter className="mr-2 h-3 w-3" />
                Filters
                {(filterPriority || filterLabel) && (
                  <Badge variant="secondary" className="ml-2 px-1 h-4 text-[10px]">
                    {[filterPriority, filterLabel].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Priority</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={filterPriority === null} onCheckedChange={() => setFilterPriority(null)}>
                All Priorities
              </DropdownMenuCheckboxItem>
              {["low", "medium", "high", "urgent"].map(p => (
                <DropdownMenuCheckboxItem key={p} checked={filterPriority === p} onCheckedChange={() => setFilterPriority(p)} className="capitalize">
                  {p}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Labels</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={filterLabel === null} onCheckedChange={() => setFilterLabel(null)}>
                All Labels
              </DropdownMenuCheckboxItem>
              {allLabels.map(label => (
                <DropdownMenuCheckboxItem key={label} checked={filterLabel === label} onCheckedChange={() => setFilterLabel(label)}>
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort By */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 shadow-sm">
                <ArrowUpDown className="mr-2 h-3 w-3" />
                Sort
                {sortBy !== "default" && (
                  <Badge variant="secondary" className="ml-2 px-1 h-4 text-[10px]">1</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel>Sort columns by</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={sortBy === "default"} onCheckedChange={() => setSortBy("default")}>
                Board order
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={sortBy === "dueDate"} onCheckedChange={() => setSortBy("dueDate")}>
                Due date
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={sortBy === "priority"} onCheckedChange={() => setSortBy("priority")}>
                Priority
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={sortBy === "alpha"} onCheckedChange={() => setSortBy("alpha")}>
                Alphabetical
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Group By */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 shadow-sm">
                <Rows3 className="mr-2 h-3 w-3" />
                Group
                {groupBy !== "none" && (
                  <Badge variant="secondary" className="ml-2 px-1 h-4 text-[10px]">1</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel>Group rows by</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={groupBy === "none"} onCheckedChange={() => setGroupBy("none")}>
                No grouping
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={groupBy === "assignee"} onCheckedChange={() => setGroupBy("assignee")}>
                Assignee
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {(filterPriority || filterLabel || searchQuery || sortBy !== "default" || groupBy !== "none") && (
            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" onClick={() => {
              setFilterPriority(null);
              setFilterLabel(null);
              setSearchQuery("");
              setSortBy("default");
              setGroupBy("none");
            }}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-6 pb-4 shrink-0 overflow-x-auto min-w-full">
        {groupBy === "none" ? (
          <>
            {columns.map((column) => (
              <Column
                key={column.id}
                column={column}
                tasks={filteredTasks.filter((t) => t.columnId === column.id)}
                workspaceId={workspaceId}
                onTaskClick={(task) => {
                  setSelectedTaskId(task.id);
                  setIsTaskDetailOpen(true);
                }}
                onTaskHover={setHoveredTaskId}
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
          </>
        ) : (
          /* ── Swimlane view ─────────────────────────────────────── */
          <div className="flex flex-col gap-6 min-w-max w-full">
            {/* Column headers row */}
            <div className="flex gap-6 pl-48">
              {columns.map((column) => (
                <div key={column.id} className="w-80 shrink-0 px-4 py-2 font-semibold text-sm flex items-center gap-2 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                  <span>{column.title}</span>
                  <span className="text-xs font-normal text-muted-foreground bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {filteredTasks.filter((t) => t.columnId === column.id).length}
                  </span>
                </div>
              ))}
            </div>

            {/* Swimlane rows — one per assignee + one unassigned */}
            {[
              { id: null, name: "Unassigned", image: null },
              ...members.map((m) => ({ id: m.userId, name: m.user.name, image: m.user.image })),
            ].map((lane) => {
              const laneTasks = filteredTasks.filter((t) =>
                lane.id === null ? !t.assignedTo : t.assignedTo === lane.id
              );
              if (laneTasks.length === 0 && lane.id !== null) return null; // hide empty non-unassigned lanes
              return (
                <div key={lane.id ?? "unassigned"} className="flex gap-6">
                  {/* Lane label */}
                  <div className="w-44 shrink-0 flex items-start gap-2 pt-3 px-2">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={lane.image || ""} />
                      <AvatarFallback className="text-[10px]">
                        {lane.id === null ? <User className="h-3 w-3" /> : (lane.name?.charAt(0).toUpperCase() || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{lane.name || "Unassigned"}</p>
                      <p className="text-[10px] text-muted-foreground">{laneTasks.length} task{laneTasks.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  {/* Columns for this lane */}
                  {columns.map((column) => (
                    <Column
                      key={column.id}
                      column={column}
                      tasks={laneTasks.filter((t) => t.columnId === column.id)}
                      workspaceId={workspaceId}
                      onTaskClick={(task) => {
                        setSelectedTaskId(task.id);
                        setIsTaskDetailOpen(true);
                      }}
                      onTaskHover={setHoveredTaskId}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Board-level empty state when search/filters produce zero results */}
      {(filterPriority || filterLabel || searchQuery.trim()) && filteredTasks.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
          <div className="bg-background/90 backdrop-blur-sm border border-border rounded-2xl p-8 flex flex-col items-center gap-3 shadow-sm pointer-events-auto">
            <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <SearchX className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">No tasks match your search</p>
              <p className="text-xs text-muted-foreground mt-0.5">Try adjusting or clearing the active filters.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setFilterPriority(null); setFilterLabel(null); setSearchQuery(""); setSortBy("default"); setGroupBy("none"); }}>
              Clear All
            </Button>
          </div>
        </div>
      )}

      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeTask ? (
          <div style={{ transform: "rotate(2deg)", opacity: 0.95 }}>
            <TaskCard task={activeTask} isOverlay />
          </div>
        ) : null}
        {activeColumn ? (
          <div className="w-80 h-full rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 border-2 border-primary/50" />
        ) : null}
      </DragOverlay>
    </DndContext>

    <TaskDetailSheet 
      task={selectedTask} 
      open={isTaskDetailOpen} 
      onOpenChange={setIsTaskDetailOpen} 
      workspaceId={workspaceId} 
    />

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
    </div>
  );
}