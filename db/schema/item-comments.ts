import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { items } from "./items";
import { workspaces } from "./workspaces";
import { users } from "./auth";

/**
 * item_comments — threaded comments on a drop/item.
 * Mirrors the todoTaskComments pattern.
 */
export const itemComments = pgTable(
  "item_comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
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
    index("idx_item_comments_item").on(table.itemId),
    index("idx_item_comments_workspace").on(table.workspaceId),
  ],
);
