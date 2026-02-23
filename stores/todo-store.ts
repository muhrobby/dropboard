import { create } from "zustand";

export interface TodoColumn {
  id: string;
  workspaceId: string;
  title: string;
  order: number;
  wipLimit: number | null;
}

export interface TodoTask {
  id: string;
  workspaceId: string;
  columnId: string;
  title: string;
  description: string | null;
  order: number;
  assignedTo: string | null;
  dueDate: Date | null;
  priority: string;
  labels: string[];
  attachments: { id: string; name: string; url: string; size: number; mimeType?: string; isCover?: boolean }[];
  subtasks: { id: string; title: string; completed: boolean }[];
}

interface TodoState {
  columns: TodoColumn[];
  tasks: TodoTask[];
  setBoard: (columns: TodoColumn[], tasks: TodoTask[]) => void;
  addColumn: (column: TodoColumn) => void;
  updateColumn: (id: string, updates: Partial<TodoColumn>) => void;
  deleteColumn: (id: string) => void;
  addTask: (task: TodoTask) => void;
  updateTask: (id: string, updates: Partial<TodoTask>) => void;
  deleteTask: (id: string) => void;
  moveTaskOptimistic: (taskId: string, newColumnId: string, newOrder: number) => void;
}

export const useTodoStore = create<TodoState>((set) => ({
  columns: [],
  tasks: [],

  setBoard: (columns, tasks) => set({ columns, tasks }),

  addColumn: (column) => set((state) => ({ columns: [...state.columns, column] })),

  updateColumn: (id, updates) =>
    set((state) => ({
      columns: state.columns.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  deleteColumn: (id) =>
    set((state) => ({
      columns: state.columns.filter((c) => c.id !== id),
      tasks: state.tasks.filter((t) => t.columnId !== id),
    })),

  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  deleteTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  moveTaskOptimistic: (taskId, newColumnId, newOrder) =>
    set((state) => {
      const taskToMove = state.tasks.find((t) => t.id === taskId);
      if (!taskToMove) return state;

      const sourceColumnId = taskToMove.columnId;
      const isSameColumn = sourceColumnId === newColumnId;

      // Filter out the task to move
      let newTasks = state.tasks.filter((t) => t.id !== taskId);

      // Get target column tasks sorted
      const targetTasks = newTasks
        .filter((t) => t.columnId === newColumnId)
        .sort((a, b) => a.order - b.order)
        .map((t) => ({ ...t })); // Clone for immutability

      // Insert task at new order
      targetTasks.splice(newOrder, 0, { ...taskToMove, columnId: newColumnId, order: newOrder });

      // Update orders sequentially
      targetTasks.forEach((t, i) => {
        t.order = i;
      });

      if (!isSameColumn) {
        // Re-order source column tasks
        const sourceTasks = newTasks
          .filter((t) => t.columnId === sourceColumnId)
          .sort((a, b) => a.order - b.order)
          .map((t) => ({ ...t })); // Clone for immutability

        sourceTasks.forEach((t, i) => {
          t.order = i;
        });

        // Recombine all arrays
        const otherTasks = newTasks.filter(
          (t) => t.columnId !== newColumnId && t.columnId !== sourceColumnId
        );
        newTasks = [...otherTasks, ...sourceTasks, ...targetTasks];
      } else {
        // Recombine arrays
        const otherTasks = newTasks.filter((t) => t.columnId !== newColumnId);
        newTasks = [...otherTasks, ...targetTasks];
      }

      return { tasks: newTasks };
    }),
}));