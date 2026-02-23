"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { todoColumns, todoTasks, todoTaskComments, workspaceMembers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/middleware/auth-guard";
import { z } from "zod";

// --- Validations ---
const createColumnSchema = z.object({
  workspaceId: z.string(),
  title: z.string().min(1).max(100),
});

const updateColumnSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string().min(1).max(100).optional(),
  wipLimit: z.number().int().min(1).nullable().optional(),
});

const createTaskSchema = z.object({
  workspaceId: z.string(),
  columnId: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});

const updateTaskSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  dueDate: z.date().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  labels: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    size: z.number(),
    mimeType: z.string().optional(),
    isCover: z.boolean().optional(),
  })).optional(),
  subtasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
  })).optional(),
});

const moveTaskSchema = z.object({
  taskId: z.string(),
  workspaceId: z.string(),
  newColumnId: z.string(),
  newOrder: z.number(),
});

// --- Helper to verify workspace access ---
async function verifyWorkspaceAccess(workspaceId: string, userId: string) {
  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.status, "active")
    ),
  });

  if (!member) {
    throw new Error("Forbidden: You do not have access to this workspace");
  }
}

// --- Actions ---

export async function getBoardData(workspaceId: string) {
  const session = await requireAuth();
  await verifyWorkspaceAccess(workspaceId, session.user.id);

  const columns = await db.query.todoColumns.findMany({
    where: eq(todoColumns.workspaceId, workspaceId),
    orderBy: (todoColumns, { asc }) => [asc(todoColumns.order)],
  });

  const tasks = await db.query.todoTasks.findMany({
    where: eq(todoTasks.workspaceId, workspaceId),
    orderBy: (todoTasks, { asc }) => [asc(todoTasks.order)],
  });

  return { columns, tasks };
}

export async function createColumn(input: z.infer<typeof createColumnSchema>) {
  try {
    const session = await requireAuth();
    const data = createColumnSchema.parse(input);
    await verifyWorkspaceAccess(data.workspaceId, session.user.id);

    const existingColumns = await db.query.todoColumns.findMany({
      where: eq(todoColumns.workspaceId, data.workspaceId),
    });

    const newOrder = existingColumns.length;

    const [column] = await db
      .insert(todoColumns)
      .values({
        workspaceId: data.workspaceId,
        title: data.title,
        order: newOrder,
      })
      .returning();

    revalidatePath("/dashboard/todo");
    return { success: true, column };
  } catch (error) {
    console.error("Failed to create column:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function updateColumn(input: z.infer<typeof updateColumnSchema>) {
  try {
    const session = await requireAuth();
    const data = updateColumnSchema.parse(input);
    await verifyWorkspaceAccess(data.workspaceId, session.user.id);

    const [column] = await db
      .update(todoColumns)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.wipLimit !== undefined && { wipLimit: data.wipLimit }),
        updatedAt: new Date(),
      })
      .where(and(eq(todoColumns.id, data.id), eq(todoColumns.workspaceId, data.workspaceId)))
      .returning();

    revalidatePath("/dashboard/todo");
    return { success: true, column };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function deleteColumn(workspaceId: string, columnId: string) {
  try {
    const session = await requireAuth();
    await verifyWorkspaceAccess(workspaceId, session.user.id);

    await db
      .delete(todoColumns)
      .where(and(eq(todoColumns.id, columnId), eq(todoColumns.workspaceId, workspaceId)));

    revalidatePath("/dashboard/todo");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function createTask(input: z.infer<typeof createTaskSchema>) {
  try {
    const session = await requireAuth();
    const data = createTaskSchema.parse(input);
    await verifyWorkspaceAccess(data.workspaceId, session.user.id);

    const existingTasks = await db.query.todoTasks.findMany({
      where: eq(todoTasks.columnId, data.columnId),
    });

    const newOrder = existingTasks.length;

    const [task] = await db
      .insert(todoTasks)
      .values({
        workspaceId: data.workspaceId,
        columnId: data.columnId,
        title: data.title,
        description: data.description,
        order: newOrder,
        createdBy: session.user.id,
      })
      .returning();

    revalidatePath("/dashboard/todo");
    return { success: true, task };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function updateTask(input: z.infer<typeof updateTaskSchema>) {
  try {
    const session = await requireAuth();
    const data = updateTaskSchema.parse(input);
    await verifyWorkspaceAccess(data.workspaceId, session.user.id);

    const [task] = await db
      .update(todoTasks)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.labels !== undefined && { labels: data.labels }),
        ...(data.attachments !== undefined && { attachments: data.attachments }),
        ...(data.subtasks !== undefined && { subtasks: data.subtasks }),
        updatedAt: new Date(),
      })
      .where(and(eq(todoTasks.id, data.id), eq(todoTasks.workspaceId, data.workspaceId)))
      .returning();

    revalidatePath("/dashboard/todo");
    return { success: true, task };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function deleteTask(workspaceId: string, taskId: string) {
  try {
    const session = await requireAuth();
    await verifyWorkspaceAccess(workspaceId, session.user.id);

    await db
      .delete(todoTasks)
      .where(and(eq(todoTasks.id, taskId), eq(todoTasks.workspaceId, workspaceId)));

    revalidatePath("/dashboard/todo");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function moveTask(input: z.infer<typeof moveTaskSchema>) {
  try {
    const session = await requireAuth();
    const data = moveTaskSchema.parse(input);
    await verifyWorkspaceAccess(data.workspaceId, session.user.id);

    // Get the task to move
    const task = await db.query.todoTasks.findFirst({
      where: and(eq(todoTasks.id, data.taskId), eq(todoTasks.workspaceId, data.workspaceId)),
    });

    if (!task) throw new Error("Task not found");

    // Fetch all tasks in the new column
    const columnTasks = await db.query.todoTasks.findMany({
      where: eq(todoTasks.columnId, data.newColumnId),
      orderBy: (todoTasks, { asc }) => [asc(todoTasks.order)],
    });

    const isSameColumn = task.columnId === data.newColumnId;
    
    // Create new sorted array of tasks for the column
    const filteredTasks = isSameColumn 
      ? columnTasks.filter((t) => t.id !== task.id)
      : columnTasks;

    filteredTasks.splice(data.newOrder, 0, { ...task, columnId: data.newColumnId } as unknown as typeof task);

    // Update the task's column and all affected order values
    // Using a transaction to ensure atomic updates
    await db.transaction(async (tx) => {
      // 1. Move the task and update its column
      await tx
        .update(todoTasks)
        .set({ 
          columnId: data.newColumnId, 
          order: data.newOrder,
          updatedAt: new Date()
        })
        .where(eq(todoTasks.id, data.taskId));

      // 2. Re-order other tasks in the target column
      for (let i = 0; i < filteredTasks.length; i++) {
        if (filteredTasks[i].id !== data.taskId) {
          await tx
            .update(todoTasks)
            .set({ order: i })
            .where(eq(todoTasks.id, filteredTasks[i].id));
        }
      }
      
      // 3. If moving between columns, re-order the source column
      if (!isSameColumn) {
        const sourceTasks = await tx.query.todoTasks.findMany({
          where: eq(todoTasks.columnId, task.columnId),
          orderBy: (todoTasks, { asc }) => [asc(todoTasks.order)],
        });
        
        for (let i = 0; i < sourceTasks.length; i++) {
          await tx
            .update(todoTasks)
            .set({ order: i })
            .where(eq(todoTasks.id, sourceTasks[i].id));
        }
      }
    });

    revalidatePath("/dashboard/todo");
    return { success: true };
  } catch (error) {
    console.error("Failed to move task:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ── Comment schemas ──────────────────────────────────────────────────────────

const createCommentSchema = z.object({
  taskId: z.string(),
  workspaceId: z.string(),
  body: z.string().min(1).max(2000),
});

const deleteCommentSchema = z.object({
  commentId: z.string(),
  workspaceId: z.string(),
});

// ── Comment response type ────────────────────────────────────────────────────

export type CommentWithAuthor = {
  id: string;
  taskId: string;
  workspaceId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
};

// ── Comment actions ──────────────────────────────────────────────────────────

export async function getTaskComments(taskId: string, workspaceId: string): Promise<{ success: boolean; comments?: CommentWithAuthor[]; error?: string }> {
  try {
    const session = await requireAuth();
    await verifyWorkspaceAccess(workspaceId, session.user.id);

    const rows = await db.query.todoTaskComments.findMany({
      where: and(
        eq(todoTaskComments.taskId, taskId),
        eq(todoTaskComments.workspaceId, workspaceId),
      ),
      orderBy: [desc(todoTaskComments.createdAt)],
      with: {
        author: {
          columns: { id: true, name: true, image: true },
        },
      },
    });

    return { success: true, comments: rows as CommentWithAuthor[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function createComment(input: z.infer<typeof createCommentSchema>) {
  try {
    const session = await requireAuth();
    const data = createCommentSchema.parse(input);
    await verifyWorkspaceAccess(data.workspaceId, session.user.id);

    const [comment] = await db
      .insert(todoTaskComments)
      .values({
        taskId: data.taskId,
        workspaceId: data.workspaceId,
        authorId: session.user.id,
        body: data.body,
      })
      .returning();

    // Re-fetch with author join so the UI can render immediately
    const full = await db.query.todoTaskComments.findFirst({
      where: eq(todoTaskComments.id, comment.id),
      with: {
        author: {
          columns: { id: true, name: true, image: true },
        },
      },
    });

    return { success: true, comment: full as CommentWithAuthor };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function deleteComment(input: z.infer<typeof deleteCommentSchema>) {
  try {
    const session = await requireAuth();
    const data = deleteCommentSchema.parse(input);
    await verifyWorkspaceAccess(data.workspaceId, session.user.id);

    // Only the author can delete their own comment
    await db
      .delete(todoTaskComments)
      .where(
        and(
          eq(todoTaskComments.id, data.commentId),
          eq(todoTaskComments.workspaceId, data.workspaceId),
          eq(todoTaskComments.authorId, session.user.id),
        )
      );

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
