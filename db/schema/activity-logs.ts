import {
  pgTable,
  text,
  varchar,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { workspaces } from "./workspaces";
import { users } from "./auth";

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(),
    targetType: varchar("target_type", { length: 50 }),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_activity_workspace_created").on(
      table.workspaceId,
      table.createdAt
    ),
  ]
);
