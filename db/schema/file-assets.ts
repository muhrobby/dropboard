import {
  pgTable,
  text,
  varchar,
  bigint,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { workspaces } from "./workspaces";
import { users } from "./auth";

export type FileMetadata = {
  width?: number;
  height?: number;
  duration?: number | null;   // seconds (video/audio); null if unknown
  pageCount?: number | null;  // PDF; null if unknown
  exif?: Record<string, unknown>;
};

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
  // Virus scan status: null = not scanned, pending, scanning, clean, infected, error
  scanStatus: varchar("scan_status", { length: 20 }),
  scanResult: text("scan_result"), // Details if infected or error
  scannedAt: timestamp("scanned_at", { mode: "date", withTimezone: true }),
  metadata: jsonb("metadata").$type<FileMetadata>(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull(),
});
