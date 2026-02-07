import {
  pgTable,
  text,
  varchar,
  bigint,
  timestamp,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { workspaces } from "./workspaces";
import { users } from "./auth";

export const fileAssets = pgTable("file_assets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  storedName: varchar("stored_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  storagePath: text("storage_path").notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull(),
});
