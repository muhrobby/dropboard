import {
  pgTable,
  text,
  varchar,
  pgEnum,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { workspaces } from "./workspaces";
import { users } from "./auth";

export const inviteRoleEnum = pgEnum("invite_role", ["admin", "member"]);
export const inviteStatusEnum = pgEnum("invite_status", ["pending", "accepted", "cancelled"]);

export const invites = pgTable(
  "invites",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    targetIdentifier: text("target_identifier").notNull(),
    role: inviteRoleEnum("role").notNull(),
    status: inviteStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_invites_token").on(table.token),
    index("idx_invites_workspace_status").on(table.workspaceId, table.status),
  ]
);
