import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { items } from "./items";
import { fileAssets } from "./file-assets";
import { users } from "./auth";
import { workspaces } from "./workspaces";

/**
 * item_versions — tracks historical file assets for a drop.
 * Every time "Upload New Version" is triggered, the current fileAssetId is
 * snapshotted here, the item's fileAssetId is updated to the new file, and
 * versionNumber is incremented.
 *
 * versionNumber 1 = original; highest = current (stored on items.fileAssetId).
 */
export const itemVersions = pgTable(
  "item_versions",
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
    // The file asset that was active at this version snapshot
    fileAssetId: text("file_asset_id")
      .notNull()
      .references(() => fileAssets.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    // 1-based; version 1 = original upload
    versionNumber: integer("version_number").notNull(),
    // Optional label, e.g. "v2 — updated logo"
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_item_versions_item").on(table.itemId),
    index("idx_item_versions_item_version").on(table.itemId, table.versionNumber),
  ],
);
