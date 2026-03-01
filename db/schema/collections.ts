import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { workspaces } from "./workspaces";
import { users } from "./auth";

export const collections = pgTable(
  "collections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    // Self-referential for nesting (null = root level)
    parentId: text("parent_id"),
    // Phase 4: Public Board sharing
    isPublic: boolean("is_public").notNull().default(false),
    shareToken: varchar("share_token", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_collections_workspace").on(table.workspaceId),
    index("idx_collections_parent").on(table.parentId),
    uniqueIndex("idx_collections_share_token").on(table.shareToken),
  ]
);
