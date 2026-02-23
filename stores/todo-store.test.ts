import { describe, it, expect, beforeEach } from "vitest";
import { useTodoStore, type TodoColumn, type TodoTask } from "./todo-store";

describe("useTodoStore", () => {
  beforeEach(() => {
    useTodoStore.setState({ columns: [], tasks: [] });
  });

  const sampleColumn: TodoColumn = { id: "col1", workspaceId: "ws1", title: "To Do", order: 0, wipLimit: null };
  const sampleTask: TodoTask = { 
    id: "task1", 
    workspaceId: "ws1", 
    columnId: "col1", 
    title: "Task 1", 
    description: "Desc", 
    order: 0, 
    assignedTo: null, 
    dueDate: null,
    priority: "medium",
    labels: [],
    attachments: [],
    subtasks: []
  };

  it("should add a column", () => {
    const store = useTodoStore.getState();
    store.addColumn(sampleColumn);
    expect(useTodoStore.getState().columns).toContain(sampleColumn);
  });

  it("should add a task", () => {
    const store = useTodoStore.getState();
    store.addTask(sampleTask);
    expect(useTodoStore.getState().tasks).toContain(sampleTask);
  });

  it("should optimally move a task within the same column", () => {
    useTodoStore.setState({
      columns: [sampleColumn],
      tasks: [
        sampleTask,
        { ...sampleTask, id: "task2", title: "Task 2", order: 1 },
      ],
    });

    const store = useTodoStore.getState();
    // Move task 2 to order 0
    store.moveTaskOptimistic("task2", "col1", 0);

    const updatedTasks = useTodoStore.getState().tasks;
    const task2 = updatedTasks.find(t => t.id === "task2");
    const task1 = updatedTasks.find(t => t.id === "task1");

    expect(task2?.order).toBe(0);
    expect(task1?.order).toBe(1);
  });

  it("should optimally move a task to a different column", () => {
    const col2: TodoColumn = { id: "col2", workspaceId: "ws1", title: "Done", order: 1, wipLimit: null };
    useTodoStore.setState({
      columns: [sampleColumn, col2],
      tasks: [
        sampleTask,
      ],
    });

    const store = useTodoStore.getState();
    // Move task 1 to col2 at order 0
    store.moveTaskOptimistic("task1", "col2", 0);

    const updatedTasks = useTodoStore.getState().tasks;
    const task1 = updatedTasks.find(t => t.id === "task1");

    expect(task1?.columnId).toBe("col2");
    expect(task1?.order).toBe(0);
  });
});