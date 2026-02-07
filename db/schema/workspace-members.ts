import {
  pgTable,
  text,
  pgEnum,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { workspaces } from "./workspaces";
import { users } from "./auth";

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "member",
]);

export const memberStatusEnum = pgEnum("member_status", [
  "active",
  "inactive",
]);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    status: memberStatusEnum("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
  },
  (table) => [unique("uq_workspace_user").on(table.workspaceId, table.userId)]
);
