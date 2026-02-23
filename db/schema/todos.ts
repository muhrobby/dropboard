import { pgTable, text, varchar, integer, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { workspaces } from "./workspaces";
import { users } from "./auth";

export const todoColumns = pgTable(
  "todo_columns",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 100 }).notNull(),
    order: integer("order").notNull().default(0),
    wipLimit: integer("wip_limit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_todo_columns_workspace_order").on(table.workspaceId, table.order),
  ]
);

export const todoTasks = pgTable(
  "todo_tasks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    columnId: text("column_id")
      .notNull()
      .references(() => todoColumns.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    order: integer("order").notNull().default(0),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    priority: varchar("priority", { length: 20 }).notNull().default("medium"),
    labels: jsonb("labels").$type<string[]>().default([]).notNull(),
    attachments: jsonb("attachments").$type<{ id: string; name: string; url: string; size: number; mimeType?: string; isCover?: boolean }[]>().default([]).notNull(),
    subtasks: jsonb("subtasks").$type<{ id: string; title: string; completed: boolean }[]>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_todo_tasks_column_order").on(table.columnId, table.order),
    index("idx_todo_tasks_workspace").on(table.workspaceId),
  ]
);

export const todoTaskComments = pgTable(
  "todo_task_comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    taskId: text("task_id")
      .notNull()
      .references(() => todoTasks.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_todo_task_comments_task").on(table.taskId),
  ]
);
