import { pgTable, text, varchar, pgEnum, bigint, timestamp } from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { users } from "./auth";

export const workspaceTypeEnum = pgEnum("workspace_type", ["personal", "team"]);

export const workspaces = pgTable("workspaces", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  name: varchar("name", { length: 100 }).notNull(),
  type: workspaceTypeEnum("type").notNull().default("personal"),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  storageUsedBytes: bigint("storage_used_bytes", { mode: "number" })
    .notNull()
    .default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
