import {
  pgTable,
  text,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { shares } from "./shares";

export const shareAnalytics = pgTable(
  "share_analytics",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    shareId: text("share_id")
      .notNull()
      .references(() => shares.id, { onDelete: "cascade" }),
    // Anonymized — hashed IP, never raw
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgent: text("user_agent"),
    referer: text("referer"),
    accessedAt: timestamp("accessed_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_share_analytics_share").on(table.shareId),
    index("idx_share_analytics_accessed_at").on(table.accessedAt),
  ],
);
