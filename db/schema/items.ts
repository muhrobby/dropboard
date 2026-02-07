import {
  pgTable,
  text,
  varchar,
  pgEnum,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { workspaces } from "./workspaces";
import { users } from "./auth";

export const itemTypeEnum = pgEnum("item_type", ["drop", "link", "note"]);

export const items = pgTable(
  "items",
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
    type: itemTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content"),
    note: text("note"),
    tags: text("tags").array().notNull().default([]),
    isPinned: boolean("is_pinned").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    fileAssetId: text("file_asset_id"),
    // Soft delete: null = active, timestamp = deleted
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_items_workspace_type").on(table.workspaceId, table.type),
    index("idx_items_workspace_created").on(table.workspaceId, table.createdAt),
    index("idx_items_expires").on(table.expiresAt),
    index("idx_items_deleted").on(table.deletedAt),
  ],
);
